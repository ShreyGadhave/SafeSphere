// Generated from the live Supabase schema — do not edit by hand.
// Regenerate: see supabase/README.md ("Regenerating TypeScript types").

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "alert_events": {
                  Row: {
                    "actor_id": string | null,"alert_id": string,"created_at": string,"id": number,"kind": Database["public"]['Enums']["alert_event_kind"],"payload": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"alert_id": string,"created_at"?: string,"id"?: never,"kind": Database["public"]['Enums']["alert_event_kind"],"payload"?: NonNullable<Json>
                  }
                  Update: {
                    "actor_id"?: string | null,"alert_id"?: string,"created_at"?: string,"id"?: never,"kind"?: Database["public"]['Enums']["alert_event_kind"],"payload"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alert_events_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    }
                  ]
                },"alert_locations": {
                  Row: {
                    "accuracy_m": number | null,"alert_id": string,"battery_pct": number | null,"heading_deg": number | null,"id": number,"location": unknown,"recorded_at": string,"speed_mps": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy_m"?: number | null,"alert_id": string,"battery_pct"?: number | null,"heading_deg"?: number | null,"id"?: never,"location": unknown,"recorded_at"?: string,"speed_mps"?: number | null
                  }
                  Update: {
                    "accuracy_m"?: number | null,"alert_id"?: string,"battery_pct"?: number | null,"heading_deg"?: number | null,"id"?: never,"location"?: unknown,"recorded_at"?: string,"speed_mps"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_locations_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    }
                  ]
                },"alerts": {
                  Row: {
                    "accuracy_m": number | null,"address": string | null,"ai_summary": string | null,"battery_pct": number | null,"city": Database["public"]['Enums']["city"] | null,"created_at": string,"emergency_type": Database["public"]['Enums']["emergency_type"],"id": string,"is_duress": boolean,"location": unknown,"model_scores": NonNullable<Json>,"priority_breakdown": Json | null,"priority_score": number | null,"resolved_at": string | null,"resolved_by": string | null,"share_expires_at": string,"share_token": string,"status": Database["public"]['Enums']["alert_status"],"trigger_source": Database["public"]['Enums']["alert_trigger"],"trip_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy_m"?: number | null,"address"?: string | null,"ai_summary"?: string | null,"battery_pct"?: number | null,"city"?: Database["public"]['Enums']["city"] | null,"created_at"?: string,"emergency_type"?: Database["public"]['Enums']["emergency_type"],"id"?: string,"is_duress"?: boolean,"location"?: unknown,"model_scores"?: NonNullable<Json>,"priority_breakdown"?: Json | null,"priority_score"?: number | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"share_expires_at"?: string,"share_token"?: string,"status"?: Database["public"]['Enums']["alert_status"],"trigger_source": Database["public"]['Enums']["alert_trigger"],"trip_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accuracy_m"?: number | null,"address"?: string | null,"ai_summary"?: string | null,"battery_pct"?: number | null,"city"?: Database["public"]['Enums']["city"] | null,"created_at"?: string,"emergency_type"?: Database["public"]['Enums']["emergency_type"],"id"?: string,"is_duress"?: boolean,"location"?: unknown,"model_scores"?: NonNullable<Json>,"priority_breakdown"?: Json | null,"priority_score"?: number | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"share_expires_at"?: string,"share_token"?: string,"status"?: Database["public"]['Enums']["alert_status"],"trigger_source"?: Database["public"]['Enums']["alert_trigger"],"trip_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_trip_id_fkey"
      columns: ["trip_id"]
isOneToOne: false
      referencedRelation: "trips"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"emergency_contacts": {
                  Row: {
                    "created_at": string,"id": string,"is_primary": boolean,"name": string,"phone": string,"position": number,"relation": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_primary"?: boolean,"name": string,"phone": string,"position"?: number,"relation"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_primary"?: boolean,"name"?: string,"phone"?: string,"position"?: number,"relation"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "emergency_contacts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"evidence": {
                  Row: {
                    "alert_id": string,"chunk_index": number,"created_at": string,"duration_s": number | null,"id": string,"kind": Database["public"]['Enums']["evidence_kind"],"recorded_at": string,"sha256": string,"size_bytes": number | null,"storage_path": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id": string,"chunk_index"?: number,"created_at"?: string,"duration_s"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["evidence_kind"],"recorded_at": string,"sha256": string,"size_bytes"?: number | null,"storage_path": string,"user_id": string
                  }
                  Update: {
                    "alert_id"?: string,"chunk_index"?: number,"created_at"?: string,"duration_s"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["evidence_kind"],"recorded_at"?: string,"sha256"?: string,"size_bytes"?: number | null,"storage_path"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evidence_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"guardian_responses": {
                  Row: {
                    "alert_id": string,"distance_m": number | null,"guardian_id": string,"status": Database["public"]['Enums']["guardian_response_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id": string,"distance_m"?: number | null,"guardian_id": string,"status"?: Database["public"]['Enums']["guardian_response_status"],"updated_at"?: string
                  }
                  Update: {
                    "alert_id"?: string,"distance_m"?: number | null,"guardian_id"?: string,"status"?: Database["public"]['Enums']["guardian_response_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guardian_responses_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guardian_responses_guardian_id_fkey"
      columns: ["guardian_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"llm_cache": {
                  Row: {
                    "created_at": string,"hits": number,"key": string,"model": string,"output": string,"prompt_kind": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"hits"?: number,"key": string,"model": string,"output": string,"prompt_kind": string
                  }
                  Update: {
                    "created_at"?: string,"hits"?: number,"key"?: string,"model"?: string,"output"?: string,"prompt_kind"?: string
                  }
                  Relationships: [
                    
                  ]
                },"medical_cards": {
                  Row: {
                    "allergies": string | null,"blood_group": string | null,"conditions": string | null,"medications": string | null,"notes": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allergies"?: string | null,"blood_group"?: string | null,"conditions"?: string | null,"medications"?: string | null,"notes"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "allergies"?: string | null,"blood_group"?: string | null,"conditions"?: string | null,"medications"?: string | null,"notes"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "medical_cards_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"model_registry": {
                  Row: {
                    "artifact_uri": string | null,"created_at": string,"id": string,"is_active": boolean,"metrics": NonNullable<Json>,"name": string,"notes": string | null,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "artifact_uri"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"metrics"?: NonNullable<Json>,"name": string,"notes"?: string | null,"version": string
                  }
                  Update: {
                    "artifact_uri"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"metrics"?: NonNullable<Json>,"name"?: string,"notes"?: string | null,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"city": Database["public"]['Enums']["city"] | null,"created_at": string,"full_name": string,"guardian_available": boolean,"guardian_status": Database["public"]['Enums']["guardian_status"],"id": string,"last_location": unknown,"last_location_at": string | null,"onboarded_at": string | null,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"city"?: Database["public"]['Enums']["city"] | null,"created_at"?: string,"full_name"?: string,"guardian_available"?: boolean,"guardian_status"?: Database["public"]['Enums']["guardian_status"],"id": string,"last_location"?: unknown,"last_location_at"?: string | null,"onboarded_at"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"city"?: Database["public"]['Enums']["city"] | null,"created_at"?: string,"full_name"?: string,"guardian_available"?: boolean,"guardian_status"?: Database["public"]['Enums']["guardian_status"],"id"?: string,"last_location"?: unknown,"last_location_at"?: string | null,"onboarded_at"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "token": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "token": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "token"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"report_comments": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"report_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"report_id": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"report_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_comments_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"report_votes": {
                  Row: {
                    "created_at": string,"report_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"report_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"report_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_votes_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "address": string | null,"ai_category": Database["public"]['Enums']["report_category"] | null,"ai_confidence": number | null,"ai_urgency": Database["public"]['Enums']["urgency"] | null,"category": Database["public"]['Enums']["report_category"],"city": Database["public"]['Enums']["city"] | null,"comment_count": number,"confirmations": number,"created_at": string,"description": string,"duplicate_of": string | null,"embedding": string | null,"id": string,"is_anonymous": boolean,"location": unknown,"media_path": string | null,"occurred_at": string,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["report_status"],"toxicity": number | null,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"ai_category"?: Database["public"]['Enums']["report_category"] | null,"ai_confidence"?: number | null,"ai_urgency"?: Database["public"]['Enums']["urgency"] | null,"category": Database["public"]['Enums']["report_category"],"city"?: Database["public"]['Enums']["city"] | null,"comment_count"?: number,"confirmations"?: number,"created_at"?: string,"description": string,"duplicate_of"?: string | null,"embedding"?: string | null,"id"?: string,"is_anonymous"?: boolean,"location": unknown,"media_path"?: string | null,"occurred_at"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"toxicity"?: number | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"ai_category"?: Database["public"]['Enums']["report_category"] | null,"ai_confidence"?: number | null,"ai_urgency"?: Database["public"]['Enums']["urgency"] | null,"category"?: Database["public"]['Enums']["report_category"],"city"?: Database["public"]['Enums']["city"] | null,"comment_count"?: number,"confirmations"?: number,"created_at"?: string,"description"?: string,"duplicate_of"?: string | null,"embedding"?: string | null,"id"?: string,"is_anonymous"?: boolean,"location"?: unknown,"media_path"?: string | null,"occurred_at"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"toxicity"?: number | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_duplicate_of_fkey"
      columns: ["duplicate_of"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"risk_cells": {
                  Row: {
                    "centroid": unknown,"city": Database["public"]['Enums']["city"],"day_type": Database["public"]['Enums']["day_type"],"h3_index": string,"hour": number,"model_version": string,"reasons": NonNullable<Json>,"score": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "centroid": unknown,"city": Database["public"]['Enums']["city"],"day_type": Database["public"]['Enums']["day_type"],"h3_index": string,"hour": number,"model_version": string,"reasons"?: NonNullable<Json>,"score": number,"updated_at"?: string
                  }
                  Update: {
                    "centroid"?: unknown,"city"?: Database["public"]['Enums']["city"],"day_type"?: Database["public"]['Enums']["day_type"],"h3_index"?: string,"hour"?: number,"model_version"?: string,"reasons"?: NonNullable<Json>,"score"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"safe_places": {
                  Row: {
                    "city": Database["public"]['Enums']["city"] | null,"id": string,"kind": Database["public"]['Enums']["place_kind"],"location": unknown,"name": string | null,"open_24h": boolean | null,"osm_id": number | null,"phone": string | null,"tags": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: Database["public"]['Enums']["city"] | null,"id"?: string,"kind": Database["public"]['Enums']["place_kind"],"location": unknown,"name"?: string | null,"open_24h"?: boolean | null,"osm_id"?: number | null,"phone"?: string | null,"tags"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "city"?: Database["public"]['Enums']["city"] | null,"id"?: string,"kind"?: Database["public"]['Enums']["place_kind"],"location"?: unknown,"name"?: string | null,"open_24h"?: boolean | null,"osm_id"?: number | null,"phone"?: string | null,"tags"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"trip_anomalies": {
                  Row: {
                    "alert_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": string,"kind": Database["public"]['Enums']["anomaly_kind"],"responded_at": string | null,"score": number | null,"trip_id": string,"user_response": Database["public"]['Enums']["anomaly_response"]
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"kind": Database["public"]['Enums']["anomaly_kind"],"responded_at"?: string | null,"score"?: number | null,"trip_id": string,"user_response"?: Database["public"]['Enums']["anomaly_response"]
                  }
                  Update: {
                    "alert_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"kind"?: Database["public"]['Enums']["anomaly_kind"],"responded_at"?: string | null,"score"?: number | null,"trip_id"?: string,"user_response"?: Database["public"]['Enums']["anomaly_response"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "trip_anomalies_alert_fk"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trip_anomalies_trip_id_fkey"
      columns: ["trip_id"]
isOneToOne: false
      referencedRelation: "trips"
      referencedColumns: ["id"]
    }
                  ]
                },"trip_points": {
                  Row: {
                    "accuracy_m": number | null,"battery_pct": number | null,"heading_deg": number | null,"id": number,"location": unknown,"recorded_at": string,"speed_mps": number | null,"trip_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy_m"?: number | null,"battery_pct"?: number | null,"heading_deg"?: number | null,"id"?: never,"location": unknown,"recorded_at"?: string,"speed_mps"?: number | null,"trip_id": string
                  }
                  Update: {
                    "accuracy_m"?: number | null,"battery_pct"?: number | null,"heading_deg"?: number | null,"id"?: never,"location"?: unknown,"recorded_at"?: string,"speed_mps"?: number | null,"trip_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trip_points_trip_id_fkey"
      columns: ["trip_id"]
isOneToOne: false
      referencedRelation: "trips"
      referencedColumns: ["id"]
    }
                  ]
                },"trips": {
                  Row: {
                    "cab_provider": string | null,"city": Database["public"]['Enums']["city"] | null,"created_at": string,"destination": unknown,"destination_name": string | null,"driver_name": string | null,"ended_at": string | null,"expected_arrival_at": string | null,"expected_routes": NonNullable<Json>,"id": string,"last_heartbeat_at": string | null,"mode": Database["public"]['Enums']["trip_mode"],"origin": unknown,"share_expires_at": string,"share_text": string | null,"share_token": string,"started_at": string,"status": Database["public"]['Enums']["trip_status"],"updated_at": string,"user_id": string,"vehicle_description": string | null,"vehicle_plate": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cab_provider"?: string | null,"city"?: Database["public"]['Enums']["city"] | null,"created_at"?: string,"destination": unknown,"destination_name"?: string | null,"driver_name"?: string | null,"ended_at"?: string | null,"expected_arrival_at"?: string | null,"expected_routes"?: NonNullable<Json>,"id"?: string,"last_heartbeat_at"?: string | null,"mode": Database["public"]['Enums']["trip_mode"],"origin"?: unknown,"share_expires_at"?: string,"share_text"?: string | null,"share_token"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["trip_status"],"updated_at"?: string,"user_id": string,"vehicle_description"?: string | null,"vehicle_plate"?: string | null
                  }
                  Update: {
                    "cab_provider"?: string | null,"city"?: Database["public"]['Enums']["city"] | null,"created_at"?: string,"destination"?: unknown,"destination_name"?: string | null,"driver_name"?: string | null,"ended_at"?: string | null,"expected_arrival_at"?: string | null,"expected_routes"?: NonNullable<Json>,"id"?: string,"last_heartbeat_at"?: string | null,"mode"?: Database["public"]['Enums']["trip_mode"],"origin"?: unknown,"share_expires_at"?: string,"share_text"?: string | null,"share_token"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["trip_status"],"updated_at"?: string,"user_id"?: string,"vehicle_description"?: string | null,"vehicle_plate"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "trips_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"zones": {
                  Row: {
                    "active": boolean,"area": unknown,"city": Database["public"]['Enums']["city"] | null,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["zone_kind"],"name": string,"night_only": boolean,"note": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"area": unknown,"city"?: Database["public"]['Enums']["city"] | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["zone_kind"],"name": string,"night_only"?: boolean,"note"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"area"?: unknown,"city"?: Database["public"]['Enums']["city"] | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["zone_kind"],"name"?: string,"night_only"?: boolean,"note"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "zones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "get_shared_alert":
{ Args: { "p_token": string }; Returns: Json
                           },
"get_shared_trip":
{ Args: { "p_token": string }; Returns: Json
                           },
"guardian_respond":
{ Args: { "p_alert_id": string,"p_distance_m"?: number,"p_status": Database["public"]['Enums']["guardian_response_status"] }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_report_public":
{ Args: { "p_report_id": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_verified_guardian":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"nearby_active_alerts":
{ Args: { "p_lat": number,"p_lng": number,"p_radius_m"?: number }; Returns: {
              "alert_id": string,"created_at": string,"distance_m": number,"emergency_type": Database["public"]['Enums']["emergency_type"],"lat": number,"lng": number
            }[]
                           },
"nearby_reports":
{ Args: { "p_before"?: string,"p_lat": number,"p_limit"?: number,"p_lng": number,"p_radius_m"?: number }; Returns: {
              "address": string,"author": string,"category": Database["public"]['Enums']["report_category"],"comment_count": number,"confirmations": number,"confirmed_by_me": boolean,"created_at": string,"description": string,"distance_m": number,"id": string,"lat": number,"lng": number,"media_path": string,"occurred_at": string,"urgency": Database["public"]['Enums']["urgency"]
            }[]
                           },
"nearest_safe_places":
{ Args: { "p_kinds"?: (Database["public"]['Enums']["place_kind"])[],"p_lat": number,"p_limit"?: number,"p_lng": number }; Returns: {
              "distance_m": number,"id": string,"kind": Database["public"]['Enums']["place_kind"],"lat": number,"lng": number,"name": string,"open_24h": boolean,"phone": string
            }[]
                           },
"risk_cells_in_bbox":
{ Args: { "p_day_type": Database["public"]['Enums']["day_type"],"p_hour": number,"p_max_lat": number,"p_max_lng": number,"p_min_lat": number,"p_min_lng": number }; Returns: {
              "h3_index": string,"lat": number,"lng": number,"score": number
            }[]
                           }
          }
          Enums: {
            "alert_event_kind": "created"|"sms_sent"|"call_placed"|"push_sent"|"location_shared"|"recording_uploaded"|"guardian_notified"|"guardian_accepted"|"guardian_arrived"|"admin_note"|"status_changed"|"resolved","alert_status": "active"|"resolved"|"cancelled"|"false_alarm","alert_trigger": "button"|"motion"|"audio"|"shake"|"ride_anomaly"|"walk_checkin"|"checkin_timeout"|"low_battery"|"heartbeat_lost","anomaly_kind": "off_route"|"unexpected_stop"|"heading_away"|"overdue"|"gps_silent","anomaly_response": "pending"|"ok"|"no_response"|"duress"|"sos","city": "mumbai"|"navi_mumbai"|"delhi"|"pune","day_type": "weekday"|"weekend","emergency_type": "unknown"|"medical"|"accident"|"crime"|"harassment"|"fire"|"other","evidence_kind": "audio"|"photo"|"video","guardian_response_status": "notified"|"accepted"|"arrived"|"declined","guardian_status": "none"|"pending"|"verified"|"revoked","place_kind": "police"|"hospital"|"pharmacy"|"fuel"|"metro"|"other","report_category": "harassment"|"theft"|"assault"|"accident"|"medical"|"fire"|"infrastructure"|"suspicious"|"other","report_status": "pending"|"approved"|"rejected","trip_mode": "walk"|"ride","trip_status": "active"|"completed"|"cancelled"|"escalated","urgency": "low"|"medium"|"high","user_role": "user"|"moderator"|"admin","zone_kind": "safe"|"unsafe"|"watch"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "alert_event_kind": ["created", "sms_sent", "call_placed", "push_sent", "location_shared", "recording_uploaded", "guardian_notified", "guardian_accepted", "guardian_arrived", "admin_note", "status_changed", "resolved"],"alert_status": ["active", "resolved", "cancelled", "false_alarm"],"alert_trigger": ["button", "motion", "audio", "shake", "ride_anomaly", "walk_checkin", "checkin_timeout", "low_battery", "heartbeat_lost"],"anomaly_kind": ["off_route", "unexpected_stop", "heading_away", "overdue", "gps_silent"],"anomaly_response": ["pending", "ok", "no_response", "duress", "sos"],"city": ["mumbai", "navi_mumbai", "delhi", "pune"],"day_type": ["weekday", "weekend"],"emergency_type": ["unknown", "medical", "accident", "crime", "harassment", "fire", "other"],"evidence_kind": ["audio", "photo", "video"],"guardian_response_status": ["notified", "accepted", "arrived", "declined"],"guardian_status": ["none", "pending", "verified", "revoked"],"place_kind": ["police", "hospital", "pharmacy", "fuel", "metro", "other"],"report_category": ["harassment", "theft", "assault", "accident", "medical", "fire", "infrastructure", "suspicious", "other"],"report_status": ["pending", "approved", "rejected"],"trip_mode": ["walk", "ride"],"trip_status": ["active", "completed", "cancelled", "escalated"],"urgency": ["low", "medium", "high"],"user_role": ["user", "moderator", "admin"],"zone_kind": ["safe", "unsafe", "watch"]
          }
        }
} as const
