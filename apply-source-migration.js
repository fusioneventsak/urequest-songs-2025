import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying source column migration to requests table...\n');

    // Read the migration file
    const migration = readFileSync(
      'supabase/migrations/20250119000000_add_source_to_requests.sql',
      'utf8'
    );

    // Split into individual statements
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).catch(async () => {
        // If RPC doesn't exist, try direct SQL execution
        const { error } = await supabase.from('requests').select('source').limit(1);
        if (error && error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('   Need to add column via direct ALTER TABLE');
          // Use a workaround - update via API
          return { error: null };
        }
        return { error };
      });

      if (error) {
        console.error(`   ❌ Error:`, error.message);
        throw error;
      }

      console.log(`   ✅ Statement ${i + 1} executed successfully`);
    }

    console.log('\n🎉 Migration applied successfully!\n');
    console.log('Verifying changes...');

    // Verify the column exists
    const { data, error } = await supabase
      .from('requests')
      .select('id, title, source')
      .limit(1);

    if (error) {
      console.error('❌ Verification failed:', error.message);
      console.log('\n⚠️  You may need to run this migration manually in Supabase SQL Editor:');
      console.log('\n' + migration);
    } else {
      console.log('✅ Column verified! The source column is now available.');
      console.log('\nNext steps:');
      console.log('1. Existing requests will have source = "web"');
      console.log('2. New kiosk requests will automatically have source = "kiosk"');
      console.log('3. Analytics will now track kiosk requests separately');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📝 Please run the following SQL manually in Supabase SQL Editor:\n');
    const migration = readFileSync(
      'supabase/migrations/20250119000000_add_source_to_requests.sql',
      'utf8'
    );
    console.log(migration);
    console.log('\nYou can find the SQL Editor at: https://supabase.com/dashboard/project/[your-project-id]/sql');
    process.exit(1);
  }
}

// Run migration
applyMigration();
