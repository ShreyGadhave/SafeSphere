package expo.modules.safespheretelephony

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SmsManager
import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Device services the SOS path needs natively:
 *  - SMS and direct calls straight from the user's SIM — no server, no internet (offline SOS);
 *  - raw 16 kHz mono microphone capture for on-device scream detection (ML-3). Expo's recorder
 *    only writes compressed files, but the detector needs PCM samples as they arrive.
 */
class SafesphereTelephonyModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  @Volatile private var capturing = false
  private var audioRecord: AudioRecord? = null
  private var captureThread: Thread? = null

  override fun definition() = ModuleDefinition {
    Name("SafesphereTelephony")

    // { pcm16: base64 little-endian 16-bit mono samples, sampleRate: Int }
    Events("onAudioChunk")

    Function("isCapturingAudio") { capturing }

    AsyncFunction("startAudioCapture") { sampleRate: Int, chunkSamples: Int, promise: Promise ->
      val ctx = context
      when {
        ctx == null -> promise.reject("ERR_NO_CONTEXT", "App context is not available", null)
        !hasPermission(ctx, Manifest.permission.RECORD_AUDIO) ->
          promise.reject("ERR_PERMISSION", "RECORD_AUDIO permission has not been granted", null)
        capturing -> promise.resolve(null)
        else -> {
          try {
            startCapture(sampleRate, chunkSamples)
            promise.resolve(null)
          } catch (e: Exception) {
            stopCapture()
            promise.reject("ERR_AUDIO_CAPTURE", e.message ?: "Could not start the microphone", e)
          }
        }
      }
    }

    AsyncFunction("stopAudioCapture") { promise: Promise ->
      stopCapture()
      promise.resolve(null)
    }

    OnDestroy { stopCapture() }

    Function("canSendSms") {
      val ctx = context ?: return@Function false
      hasTelephony(ctx) && hasPermission(ctx, Manifest.permission.SEND_SMS)
    }

    Function("canCall") {
      val ctx = context ?: return@Function false
      hasTelephony(ctx) && hasPermission(ctx, Manifest.permission.CALL_PHONE)
    }

    // Resolves once Android reports the outcome of every SMS part (or after the timeout).
    AsyncFunction("sendSms") { phone: String, message: String, promise: Promise ->
      val ctx = context
      when {
        ctx == null -> promise.reject("ERR_NO_CONTEXT", "App context is not available", null)
        !hasTelephony(ctx) -> promise.reject("ERR_NO_TELEPHONY", "This device cannot send SMS", null)
        !hasPermission(ctx, Manifest.permission.SEND_SMS) ->
          promise.reject("ERR_PERMISSION", "SEND_SMS permission has not been granted", null)
        phone.isBlank() || message.isBlank() ->
          promise.reject("ERR_INVALID_ARGS", "Phone number and message are required", null)
        else -> sendSms(ctx, phone.trim(), message, promise)
      }
    }

    AsyncFunction("placeCall") { phone: String, promise: Promise ->
      val ctx = context
      when {
        ctx == null -> promise.reject("ERR_NO_CONTEXT", "App context is not available", null)
        !hasTelephony(ctx) -> promise.reject("ERR_NO_TELEPHONY", "This device cannot place calls", null)
        !hasPermission(ctx, Manifest.permission.CALL_PHONE) ->
          promise.reject("ERR_PERMISSION", "CALL_PHONE permission has not been granted", null)
        phone.isBlank() -> promise.reject("ERR_INVALID_ARGS", "Phone number is required", null)
        else -> {
          try {
            // Android routes emergency numbers (112, 100…) to the dialer instead of calling directly.
            val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:" + Uri.encode(phone.trim())))
              .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            (appContext.currentActivity ?: ctx).startActivity(intent)
            promise.resolve(null)
          } catch (e: Exception) {
            promise.reject("ERR_CALL_FAILED", e.message ?: "Could not place the call", e)
          }
        }
      }
    }
  }

  private fun sendSms(ctx: Context, phone: String, message: String, promise: Promise) {
    val smsManager: SmsManager = try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        ctx.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }
    } catch (e: Exception) {
      promise.reject("ERR_SMS_UNAVAILABLE", e.message ?: "SMS service unavailable", e)
      return
    }

    val parts = smsManager.divideMessage(message)
    val action = "expo.modules.safespheretelephony.SMS_SENT." + UUID.randomUUID()
    val remaining = AtomicInteger(parts.size)
    val failed = AtomicInteger(0)
    val errorCodes = mutableListOf<Int>()
    val settled = AtomicBoolean(false)
    val handler = Handler(Looper.getMainLooper())
    lateinit var receiver: BroadcastReceiver

    fun settle(timedOut: Boolean) {
      if (!settled.compareAndSet(false, true)) return
      handler.removeCallbacksAndMessages(null)
      try { ctx.unregisterReceiver(receiver) } catch (_: Exception) {}
      val failedParts = failed.get() + if (timedOut) remaining.get() else 0
      promise.resolve(
        mapOf(
          "sent" to (failedParts == 0),
          "parts" to parts.size,
          "failedParts" to failedParts,
          "errorCodes" to synchronized(errorCodes) { errorCodes.toList() },
          "timedOut" to timedOut,
        )
      )
    }

    receiver = object : BroadcastReceiver() {
      override fun onReceive(c: Context?, intent: Intent?) {
        if (resultCode != Activity.RESULT_OK) {
          failed.incrementAndGet()
          synchronized(errorCodes) { errorCodes.add(resultCode) }
        }
        if (remaining.decrementAndGet() <= 0) settle(timedOut = false)
      }
    }

    val filter = IntentFilter(action)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ctx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      ctx.registerReceiver(receiver, filter)
    }

    val sentIntents = ArrayList<PendingIntent>(parts.size)
    for (i in parts.indices) {
      val intent = Intent(action).setPackage(ctx.packageName)
      sentIntents.add(
        PendingIntent.getBroadcast(ctx, i, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      )
    }

    try {
      if (parts.size == 1) {
        smsManager.sendTextMessage(phone, null, message, sentIntents[0], null)
      } else {
        smsManager.sendMultipartTextMessage(phone, null, parts, sentIntents, null)
      }
    } catch (e: Exception) {
      if (settled.compareAndSet(false, true)) {
        try { ctx.unregisterReceiver(receiver) } catch (_: Exception) {}
        promise.reject("ERR_SMS_FAILED", e.message ?: "Could not send SMS", e)
      }
      return
    }

    // No signal can leave the send pending for a long time; report back instead of hanging.
    handler.postDelayed({ settle(timedOut = true) }, SEND_TIMEOUT_MS)
  }

  @Suppress("MissingPermission") // checked by the caller
  private fun startCapture(sampleRate: Int, chunkSamples: Int) {
    val minBuffer = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    require(minBuffer > 0) { "Unsupported sample rate $sampleRate" }
    val record = AudioRecord(
      MediaRecorder.AudioSource.MIC,
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      maxOf(minBuffer, chunkSamples * 2 * 2),
    )
    check(record.state == AudioRecord.STATE_INITIALIZED) { "Microphone is busy or unavailable" }
    record.startRecording()
    audioRecord = record
    capturing = true
    captureThread = Thread({
      val buffer = ShortArray(chunkSamples)
      while (capturing) {
        var read = 0
        while (read < chunkSamples && capturing) {
          val n = record.read(buffer, read, chunkSamples - read)
          if (n <= 0) break
          read += n
        }
        if (read == chunkSamples) {
          val bytes = ByteBuffer.allocate(read * 2).order(ByteOrder.LITTLE_ENDIAN)
          bytes.asShortBuffer().put(buffer, 0, read)
          sendEvent(
            "onAudioChunk",
            mapOf("pcm16" to Base64.encodeToString(bytes.array(), Base64.NO_WRAP), "sampleRate" to sampleRate),
          )
        } else if (read == 0) {
          Thread.sleep(20)
        }
      }
    }, "SafeSphereAudioCapture").apply { isDaemon = true; start() }
  }

  private fun stopCapture() {
    capturing = false
    captureThread?.join(500)
    captureThread = null
    audioRecord?.let {
      try { it.stop() } catch (_: Exception) {}
      it.release()
    }
    audioRecord = null
  }

  private fun hasPermission(ctx: Context, permission: String): Boolean =
    ctx.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  private fun hasTelephony(ctx: Context): Boolean =
    ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)

  companion object {
    private const val SEND_TIMEOUT_MS = 30_000L
  }
}
