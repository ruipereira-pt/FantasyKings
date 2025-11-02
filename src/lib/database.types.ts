export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          atp_id: number | null
          name: string
          country: string | null
          ranking: number | null
          live_ranking: number | null
          points: number
          price: number
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          atp_id?: number | null
          name: string
          country?: string | null
          ranking?: number | null
          live_ranking?: number | null
          points?: number
          price?: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          atp_id?: number | null
          name?: string
          country?: string | null
          ranking?: number | null
          live_ranking?: number | null
          points?: number
          price?: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          name: string
          category: 'grand_slam' | 'atp_1000' | 'atp_500' | 'atp_250' | 'finals' | 'challenger'
          surface: 'hard' | 'clay' | 'grass' | 'carpet' | null
          location: string | null
          start_date: string
          end_date: string
          prize_money: number | null
          status: 'upcoming' | 'ongoing' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: 'grand_slam' | 'atp_1000' | 'atp_500' | 'atp_250' | 'finals' | 'challenger'
          surface?: 'hard' | 'clay' | 'grass' | 'carpet' | null
          location?: string | null
          start_date: string
          end_date: string
          prize_money?: number | null
          status?: 'upcoming' | 'ongoing' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: 'grand_slam' | 'atp_1000' | 'atp_500' | 'atp_250' | 'finals' | 'challenger'
          surface?: 'hard' | 'clay' | 'grass' | 'carpet' | null
          location?: string | null
          start_date?: string
          end_date?: string
          prize_money?: number | null
          status?: 'upcoming' | 'ongoing' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      player_schedules: {
        Row: {
          id: string
          player_id: string | null
          tournament_id: string | null
          status: 'registered' | 'withdrawn' | 'eliminated' | 'champion' | 'confirmed' | 'qualifying' | 'alternate'
          entry_type: string | null
          seed_number: number | null
          eliminated_round: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id?: string | null
          tournament_id?: string | null
          status?: 'registered' | 'withdrawn' | 'eliminated' | 'champion' | 'confirmed' | 'qualifying' | 'alternate'
          entry_type?: string | null
          seed_number?: number | null
          eliminated_round?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string | null
          tournament_id?: string | null
          status?: 'registered' | 'withdrawn' | 'eliminated' | 'champion' | 'confirmed' | 'qualifying' | 'alternate'
          entry_type?: string | null
          seed_number?: number | null
          eliminated_round?: string | null
          created_at?: string
        }
      }
      competition_tournaments: {
        Row: {
          id: string
          competition_id: string | null
          tournament_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          competition_id?: string | null
          tournament_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          competition_id?: string | null
          tournament_id?: string | null
          created_at?: string
        }
      }
      competitions: {
        Row: {
          id: string
          name: string
          type: 'season' | 'road_to_major' | 'per_competition' | 'per_gameweek'
          max_players: number
          max_changes: number
          budget: number
          start_date: string
          end_date: string
          status: 'upcoming' | 'active' | 'completed'
          tournament_id: string | null
          major_target: 'ao' | 'rg' | 'wimbledon' | 'uso' | 'finals' | null
          gameweek_number: number | null
          join_deadline: string | null
          number_of_players: number | null
          first_round: string | null
          points_per_round: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'season' | 'road_to_major' | 'per_competition' | 'per_gameweek'
          max_players: number
          max_changes: number
          budget?: number
          start_date: string
          end_date: string
          status?: 'upcoming' | 'active' | 'completed'
          tournament_id?: string | null
          major_target?: 'ao' | 'rg' | 'wimbledon' | 'uso' | 'finals' | null
          gameweek_number?: number | null
          join_deadline?: string | null
          number_of_players?: number | null
          first_round?: string | null
          points_per_round?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'season' | 'road_to_major' | 'per_competition' | 'per_gameweek'
          max_players?: number
          max_changes?: number
          budget?: number
          start_date?: string
          end_date?: string
          status?: 'upcoming' | 'active' | 'completed'
          tournament_id?: string | null
          major_target?: 'ao' | 'rg' | 'wimbledon' | 'uso' | 'finals' | null
          gameweek_number?: number | null
          join_deadline?: string | null
          number_of_players?: number | null
          first_round?: string | null
          points_per_round?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_teams: {
        Row: {
          id: string
          user_id: string
          competition_id: string | null
          team_name: string
          total_points: number
          rank: number | null
          changes_made: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          competition_id?: string | null
          team_name: string
          total_points?: number
          rank?: number | null
          changes_made?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          competition_id?: string | null
          team_name?: string
          total_points?: number
          rank?: number | null
          changes_made?: number
          created_at?: string
          updated_at?: string
        }
      }
      team_players: {
        Row: {
          id: string
          user_team_id: string | null
          player_id: string | null
          selected_at: string
          removed_at: string | null
          points_earned: number
        }
        Insert: {
          id?: string
          user_team_id?: string | null
          player_id?: string | null
          selected_at?: string
          removed_at?: string | null
          points_earned?: number
        }
        Update: {
          id?: string
          user_team_id?: string | null
          player_id?: string | null
          selected_at?: string
          removed_at?: string | null
          points_earned?: number
        }
      }
      player_performances: {
        Row: {
          id: string
          player_id: string | null
          tournament_id: string | null
          round_reached: 'r128' | 'r64' | 'r32' | 'r16' | 'qf' | 'sf' | 'f' | 'w' | null
          matches_won: number
          matches_lost: number
          fantasy_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          player_id?: string | null
          tournament_id?: string | null
          round_reached?: 'r128' | 'r64' | 'r32' | 'r16' | 'qf' | 'sf' | 'f' | 'w' | null
          matches_won?: number
          matches_lost?: number
          fantasy_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string | null
          tournament_id?: string | null
          round_reached?: 'r128' | 'r64' | 'r32' | 'r16' | 'qf' | 'sf' | 'f' | 'w' | null
          matches_won?: number
          matches_lost?: number
          fantasy_points?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
