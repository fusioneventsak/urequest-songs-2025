import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// File paths
const SONGS_FILE = 'C:\\Users\\arthu\\Downloads\\songs_rows.sql';
const SET_LISTS_FILE = 'C:\\Users\\arthu\\Downloads\\set_lists_rows.sql';
const SET_LIST_SONGS_FILE = 'C:\\Users\\arthu\\Downloads\\set_list_songs_rows.sql';

// Parse SQL INSERT statement into JavaScript objects
function parseSqlInsert(sql, tableName) {
  const insertRegex = new RegExp(`INSERT INTO "public"\\."${tableName}" \\(([^)]+)\\) VALUES`, 'g');
  const match = insertRegex.exec(sql);

  if (!match) {
    console.error(`Could not find INSERT statement for table: ${tableName}`);
    return [];
  }

  // Get column names
  const columns = match[1].split(',').map(col => col.trim().replace(/"/g, ''));

  // Extract all value rows
  const valuesRegex = /\(([^)]+(?:\([^)]*\)[^)]*)*)\)(?:,|\s*;)/g;
  const rows = [];
  let valueMatch;

  while ((valueMatch = valuesRegex.exec(sql)) !== null) {
    const values = parseValues(valueMatch[1]);
    if (values.length === columns.length) {
      const row = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      rows.push(row);
    }
  }

  return rows;
}

// Parse individual values from SQL, handling quotes and nulls
function parseValues(valuesString) {
  const values = [];
  let current = '';
  let inQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < valuesString.length; i++) {
    const char = valuesString[i];

    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === "'") {
      if (inQuotes) {
        // Check for doubled single quote (SQL escape)
        if (i + 1 < valuesString.length && valuesString[i + 1] === "'") {
          current += "'";
          i++; // Skip next quote
          continue;
        }
        inQuotes = false;
      } else {
        inQuotes = true;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim() === '' || current.trim() === 'NULL' ? null : current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  // Push last value
  if (current.trim()) {
    values.push(current.trim() === 'NULL' ? null : current.trim());
  }

  return values;
}

// Main migration function
async function migrateDatabse() {
  try {
    console.log('🚀 Starting database migration...\n');

    // Step 1: Clear existing data
    console.log('🗑️  Step 1: Clearing existing data...');

    // Delete in correct order (due to foreign keys)
    console.log('   - Deleting song requests...');
    const { error: requestsError } = await supabase
      .from('song_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (requestsError && requestsError.code !== 'PGRST116') { // PGRST116 = no rows to delete
      console.log('   ⚠️  Note:', requestsError.message);
    } else {
      console.log('   ✅ Song requests cleared');
    }

    console.log('   - Deleting set list songs...');
    const { error: setListSongsError } = await supabase
      .from('set_list_songs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (setListSongsError && setListSongsError.code !== 'PGRST116') {
      console.log('   ⚠️  Note:', setListSongsError.message);
    } else {
      console.log('   ✅ Set list songs cleared');
    }

    console.log('   - Deleting set lists...');
    const { error: setListsError } = await supabase
      .from('set_lists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (setListsError && setListsError.code !== 'PGRST116') {
      console.log('   ⚠️  Note:', setListsError.message);
    } else {
      console.log('   ✅ Set lists cleared');
    }

    console.log('   - Deleting songs...');
    const { error: songsError } = await supabase
      .from('songs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (songsError && songsError.code !== 'PGRST116') {
      console.log('   ⚠️  Note:', songsError.message);
    } else {
      console.log('   ✅ Songs cleared');
    }

    console.log('\n✅ Step 1 complete: All existing data cleared\n');

    // Step 2: Load and parse SQL files
    console.log('📖 Step 2: Loading SQL files...');
    const songsSql = readFileSync(SONGS_FILE, 'utf8');
    const setListsSql = readFileSync(SET_LISTS_FILE, 'utf8');
    const setListSongsSql = readFileSync(SET_LIST_SONGS_FILE, 'utf8');
    console.log('✅ SQL files loaded\n');

    // Step 3: Parse SQL into objects
    console.log('🔍 Step 3: Parsing SQL data...');
    const songs = parseSqlInsert(songsSql, 'songs');
    const setLists = parseSqlInsert(setListsSql, 'set_lists');
    const setListSongs = parseSqlInsert(setListSongsSql, 'set_list_songs');

    console.log(`   - Found ${songs.length} songs`);
    console.log(`   - Found ${setLists.length} set lists`);
    console.log(`   - Found ${setListSongs.length} set list song mappings`);
    console.log('✅ Step 3 complete\n');

    // Step 4: Insert songs in batches
    console.log('📝 Step 4: Inserting songs...');
    const BATCH_SIZE = 100;
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = songs.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('songs').insert(batch);
      if (error) {
        console.error(`   ❌ Error inserting songs batch ${i / BATCH_SIZE + 1}:`, error);
        throw error;
      }
      console.log(`   ✅ Inserted songs ${i + 1} to ${Math.min(i + BATCH_SIZE, songs.length)}`);
    }
    console.log(`✅ Step 4 complete: ${songs.length} songs inserted\n`);

    // Step 5: Insert set lists
    console.log('📝 Step 5: Inserting set lists...');
    const { error: insertSetListsError } = await supabase
      .from('set_lists')
      .insert(setLists);
    if (insertSetListsError) {
      console.error('   ❌ Error inserting set lists:', insertSetListsError);
      throw insertSetListsError;
    }
    console.log(`✅ Step 5 complete: ${setLists.length} set lists inserted\n`);

    // Step 6: Insert set list songs in batches
    console.log('📝 Step 6: Inserting set list songs...');
    for (let i = 0; i < setListSongs.length; i += BATCH_SIZE) {
      const batch = setListSongs.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('set_list_songs').insert(batch);
      if (error) {
        console.error(`   ❌ Error inserting set list songs batch ${i / BATCH_SIZE + 1}:`, error);
        throw error;
      }
      console.log(`   ✅ Inserted set list songs ${i + 1} to ${Math.min(i + BATCH_SIZE, setListSongs.length)}`);
    }
    console.log(`✅ Step 6 complete: ${setListSongs.length} set list songs inserted\n`);

    // Summary
    console.log('🎉 MIGRATION COMPLETE! 🎉\n');
    console.log('Summary:');
    console.log(`  - ${songs.length} songs imported`);
    console.log(`  - ${setLists.length} set lists imported`);
    console.log(`  - ${setListSongs.length} song-to-setlist mappings imported`);
    console.log('\nYour database now contains only the data from the provided SQL files.');
    console.log('Refresh your app to see the changes!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateDatabse();
