package expo.modules.safespheretelephony

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SmsManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Sends SMS and places calls straight from the user's SIM — no server, no internet.
 * This is SafeSphere's offline SOS path, so it must never depend on network services.
 */
class SafesphereTelephonyModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("SafesphereTelephony")

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

  private fun hasPermission(ctx: Context, permission: String): Boolean =
    ctx.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  private fun hasTelephony(ctx: Context): Boolean =
    ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)

  companion object {
    private const val SEND_TIMEOUT_MS = 30_000L
  }
}
