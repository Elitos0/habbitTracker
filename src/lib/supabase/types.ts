/** Auto-generated Supabase Database types for the habits schema. */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          app_language: string;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          app_language?: string;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          app_language?: string;
          timezone?: string | null;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string | null;
        };
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          color: string;
          icon: string | null;
          scheduled_time: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          color: string;
          icon?: string | null;
          scheduled_time?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
          sort_order?: number;
        };
        Update: {
          title?: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          scheduled_time?: string | null;
          is_archived?: boolean;
          updated_at?: string;
          sort_order?: number;
        };
      };
      habit_tags: {
        Row: {
          habit_id: string;
          tag_id: string;
        };
        Insert: {
          habit_id: string;
          tag_id: string;
        };
        Update: never;
      };
      habit_schedules: {
        Row: {
          id: string;
          habit_id: string;
          schedule_type: string;
          interval_days: number | null;
          weekdays: string | null;
          start_date: string;
          end_date: string | null;
          times_per_day: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          habit_id: string;
          schedule_type: string;
          interval_days?: number | null;
          weekdays?: string | null;
          start_date: string;
          end_date?: string | null;
          times_per_day?: number;
          active?: boolean;
        };
        Update: {
          schedule_type?: string;
          interval_days?: number | null;
          weekdays?: string | null;
          start_date?: string;
          end_date?: string | null;
          times_per_day?: number;
          active?: boolean;
        };
      };
      habit_checklist_items: {
        Row: {
          id: string;
          habit_id: string;
          label: string;
          slot_type: string | null;
          is_required: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          habit_id: string;
          label: string;
          slot_type?: string | null;
          is_required?: boolean;
          sort_order?: number;
        };
        Update: {
          label?: string;
          slot_type?: string | null;
          is_required?: boolean;
          sort_order?: number;
        };
      };
      completion_records: {
        Row: {
          id: string;
          habit_id: string;
          local_date: string;
          completion_status: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          local_date: string;
          completion_status?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          completion_status?: string;
          note?: string | null;
          updated_at?: string;
        };
      };
      sub_item_completions: {
        Row: {
          id: string;
          completion_record_id: string;
          checklist_item_id: string;
          is_done: boolean;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          completion_record_id: string;
          checklist_item_id: string;
          is_done?: boolean;
          completed_at?: string | null;
        };
        Update: {
          is_done?: boolean;
          completed_at?: string | null;
        };
      };
      reminder_rules: {
        Row: {
          id: string;
          habit_id: string;
          channel_type: string;
          trigger_type: string;
          time_of_day: string;
          weekday: number | null;
          interval_days: number | null;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          habit_id: string;
          channel_type: string;
          trigger_type: string;
          time_of_day: string;
          weekday?: number | null;
          interval_days?: number | null;
          enabled?: boolean;
        };
        Update: {
          channel_type?: string;
          trigger_type?: string;
          time_of_day?: string;
          weekday?: number | null;
          interval_days?: number | null;
          enabled?: boolean;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
