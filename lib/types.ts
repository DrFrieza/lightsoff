export type Child = {
  id: string;
  user_id: string;
  name: string;
  birth_date?: string;
  created_at: string;
};

export type BedtimeEntry = {
  id: string;
  user_id: string;
  child_id: string;
  date: string;
  lights_off_time: string;
  asleep_time?: string;
  tags: string[];
  created_at: string;
};