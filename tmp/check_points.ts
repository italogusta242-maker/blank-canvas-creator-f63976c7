
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkPoints() {
  const email = 'teste@anaac.com';
  const { data: user } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User ID:', user.id);
  
  const { data: newPoints } = await supabase.from('hustle_points').select('points').eq('user_id', user.id);
  const { data: legacyLog } = await (supabase as any).from('hustle_points_log').select('points').eq('user_id', user.id);
  const { data: legacyTotal } = await (supabase as any).from('user_hustle_points').select('total_points').eq('user_id', user.id).maybeSingle();
  
  console.log('New table hustle_points:', newPoints?.reduce((a, b) => a + b.points, 0) || 0);
  console.log('Legacy table hustle_points_log:', legacyLog?.reduce((a, b) => a + b.points, 0) || 0);
  console.log('Legacy total (user_hustle_points):', legacyTotal?.total_points || 0);
}

checkPoints();
