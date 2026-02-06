export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          name: string;
          number: number | null;
          position: string | null;
          photo_url: string | null;
          intro_video_url: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          number?: number | null;
          position?: string | null;
          photo_url?: string | null;
          intro_video_url?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          number?: number | null;
          position?: string | null;
          photo_url?: string | null;
          intro_video_url?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      opponents: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          name: string;
          date: string;
          type: 'match' | 'training' | 'tournament';
          opponent_id: string | null;
          goals_for: number;
          goals_against: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          date: string;
          type?: 'match' | 'training' | 'tournament';
          opponent_id?: string | null;
          goals_for?: number;
          goals_against?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string;
          type?: 'match' | 'training' | 'tournament';
          opponent_id?: string | null;
          goals_for?: number;
          goals_against?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          title: string;
          file_url: string;
          thumbnail_url: string | null;
          duration: number | null;
          match_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          file_url: string;
          thumbnail_url?: string | null;
          duration?: number | null;
          match_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          file_url?: string;
          thumbnail_url?: string | null;
          duration?: number | null;
          match_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          video_id: string;
          time: number;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          time: number;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          time?: number;
          text?: string;
          created_at?: string;
        };
      };
      audio_comments: {
        Row: {
          id: string;
          video_id: string;
          time: number;
          duration: number | null;
          audio_url: string;
          transcript: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          time: number;
          duration?: number | null;
          audio_url: string;
          transcript?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          time?: number;
          duration?: number | null;
          audio_url?: string;
          transcript?: string | null;
          created_at?: string;
        };
      };
      screenshots: {
        Row: {
          id: string;
          video_id: string;
          time: number;
          image_url: string;
          annotations_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          time: number;
          image_url: string;
          annotations_json?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          time?: number;
          image_url?: string;
          annotations_json?: Json | null;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          match_id: string;
          scorer_id: string;
          assist_id: string | null;
          minute: number | null;
          video_id: string | null;
          video_time: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          scorer_id: string;
          assist_id?: string | null;
          minute?: number | null;
          video_id?: string | null;
          video_time?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          scorer_id?: string;
          assist_id?: string | null;
          minute?: number | null;
          video_id?: string | null;
          video_time?: number | null;
          created_at?: string;
        };
      };
      player_photos: {
        Row: {
          id: string;
          player_id: string;
          photo_url: string;
          match_id: string | null;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          photo_url: string;
          match_id?: string | null;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          photo_url?: string;
          match_id?: string | null;
          caption?: string | null;
          created_at?: string;
        };
      };
      player_clips: {
        Row: {
          id: string;
          player_id: string;
          video_id: string;
          start_time: number;
          end_time: number;
          title: string;
          category: 'goal' | 'assist' | 'skill' | 'defense' | 'other';
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          video_id: string;
          start_time: number;
          end_time: number;
          title: string;
          category?: 'goal' | 'assist' | 'skill' | 'defense' | 'other';
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          video_id?: string;
          start_time?: number;
          end_time?: number;
          title?: string;
          category?: 'goal' | 'assist' | 'skill' | 'defense' | 'other';
          created_at?: string;
        };
      };
      annotations: {
        Row: {
          id: string;
          video_id: string;
          time: number;
          annotations_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          time: number;
          annotations_json: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          time?: number;
          annotations_json?: Json;
          created_at?: string;
        };
      };
    };
  };
}

// Convenience types
export type Player = Database['public']['Tables']['players']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Video = Database['public']['Tables']['videos']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type AudioComment = Database['public']['Tables']['audio_comments']['Row'];
export type Screenshot = Database['public']['Tables']['screenshots']['Row'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type PlayerPhoto = Database['public']['Tables']['player_photos']['Row'];
export type PlayerClip = Database['public']['Tables']['player_clips']['Row'];
export type Annotation = Database['public']['Tables']['annotations']['Row'];
