import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugKioskTracking() {
  console.log('🔍 COMPREHENSIVE KIOSK TRACKING DEBUG\n');
  console.log('='.repeat(60));

  // 1. Check requesters table schema
  console.log('\n📋 STEP 1: Requesters Table Schema');
  console.log('-'.repeat(60));
  const { data: sampleRequester } = await supabase
    .from('requesters')
    .select('*')
    .limit(1)
    .single();

  if (sampleRequester) {
    console.log('Columns:', Object.keys(sampleRequester).join(', '));
    console.log('Has source column:', 'source' in sampleRequester ? '✅ YES' : '❌ NO');
  }

  // 2. Get ALL requesters with source field
  console.log('\n📊 STEP 2: All Requesters in Database');
  console.log('-'.repeat(60));
  const { data: allRequesters } = await supabase
    .from('requesters')
    .select('id, name, source, created_at')
    .order('created_at', { ascending: false });

  console.log(`Total requesters: ${allRequesters?.length || 0}`);

  const sourceCounts = { kiosk: 0, web: 0, null: 0 };
  allRequesters?.forEach(r => {
    if (r.source === 'kiosk') sourceCounts.kiosk++;
    else if (r.source === 'web') sourceCounts.web++;
    else sourceCounts.null++;
  });

  console.log('Source breakdown:');
  console.log(`  - Kiosk: ${sourceCounts.kiosk}`);
  console.log(`  - Web: ${sourceCounts.web}`);
  console.log(`  - NULL: ${sourceCounts.null}`);

  if (allRequesters && allRequesters.length > 0) {
    console.log('\nRecent requesters:');
    allRequesters.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} - source: ${r.source || 'NULL'} - ${new Date(r.created_at).toLocaleString()}`);
    });
  }

  // 3. Get requests with requesters (exactly as Analytics fetches)
  console.log('\n📦 STEP 3: Requests with Requesters (Analytics Query)');
  console.log('-'.repeat(60));
  const { data: requests } = await supabase
    .from('requests')
    .select(`
      *,
      requesters (
        id,
        name,
        photo,
        message,
        source,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  console.log(`Total requests: ${requests?.length || 0}`);

  let totalKioskRequesters = 0;
  let totalWebRequesters = 0;

  requests?.forEach(req => {
    const requesters = req.requesters || [];
    requesters.forEach(r => {
      if (r.source === 'kiosk') totalKioskRequesters++;
      else if (r.source === 'web') totalWebRequesters++;
    });
  });

  console.log('\nRequester counts from requests query:');
  console.log(`  - Kiosk requesters: ${totalKioskRequesters}`);
  console.log(`  - Web requesters: ${totalWebRequesters}`);

  // 4. Show details of each request
  if (requests && requests.length > 0) {
    console.log('\nDetailed request breakdown:');
    requests.slice(0, 5).forEach((req, i) => {
      const requesters = req.requesters || [];
      console.log(`\n  ${i + 1}. "${req.title}" by ${req.artist}`);
      console.log(`     Created: ${new Date(req.created_at).toLocaleString()}`);
      console.log(`     Requesters: ${requesters.length}`);
      requesters.forEach(r => {
        console.log(`       - ${r.name} (source: ${r.source || 'NULL'})`);
      });
    });
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total kiosk requesters that SHOULD show in Analytics: ${totalKioskRequesters}`);

  if (totalKioskRequesters === 0) {
    console.log('\n⚠️  NO KIOSK REQUESTERS FOUND!');
    console.log('This means either:');
    console.log('  1. No requests have been made from /kiosk page yet');
    console.log('  2. Requests from /kiosk are not saving source="kiosk"');
    console.log('\n💡 Next step: Make a request from /kiosk and check if source is saved');
  } else {
    console.log(`\n✅ Found ${totalKioskRequesters} kiosk requesters`);
    console.log('If Analytics still shows 0, the problem is in the UI/processing logic');
  }
}

debugKioskTracking();
