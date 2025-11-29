/*
  Create Genre-Based Setlists Migration
  
  This migration creates setlists based on genres and assigns songs to them
*/

DO $$
DECLARE
  user_id_val UUID := 'af200428-ba71-4ba1-b092-5031f5f488d3';
  
  -- Setlist IDs
  pop_setlist_id UUID;
  rock_setlist_id UUID;
  country_setlist_id UUID;
  rb_soul_setlist_id UUID;
  disco_funk_setlist_id UUID;
  hip_hop_setlist_id UUID;
  reggae_setlist_id UUID;
  
  song_record RECORD;
  position_counter INTEGER;
BEGIN
  -- Create genre-based setlists
  
  -- Pop/Top40 Setlist
  INSERT INTO set_lists (id, name, date, notes, is_active, user_id, created_at)
  VALUES (gen_random_uuid(), 'Pop & Top 40 Hits', CURRENT_DATE, 'Popular and chart-topping songs', false, user_id_val, NOW())
  RETURNING id INTO pop_setlist_id;
  
  -- Rock Setlist
  INSERT INTO set_lists (id, name, date, notes, is_active, user_id, created_at)
  VALUES (gen_random_uuid(), 'Rock Classics', CURRENT_DATE, 'Classic rock and modern rock hits', false, user_id_val, NOW())
  RETURNING id INTO rock_setlist_id;
  
  -- Country Setlist
  INSERT INTO set_lists (id, name, date, notes, is_active, user_id, created_at)
  VALUES (gen_random_uuid(), 'Country Favorites', CURRENT_DATE, 'Country music hits', false, user_id_val, NOW())
  RETURNING id INTO country_setlist_id;
  
  -- R&B/Soul Setlist
  INSERT INTO set_lists (id, name, date, notes, is_active, user_id, created_at)
  VALUES (gen_random_uuid(), 'R&B & Soul', CURRENT_DATE, 'R&B, Soul, and Motown classics', false, user_id_val, NOW())
  RETURNING id INTO rb_soul_setlist_id;
  
  -- Disco/Funk Setlist
  INSERT INTO set_lists (id, name, date, notes, is_active, user_id, created_at)
  VALUES (gen_random_uuid(), 'Disco & Funk', CURRENT_DATE, 'Disco and funk dance hits', false, user_id_val, NOW())
  RETURNING id INTO disco_funk_setlist_id;
  
  -- Hip Hop Setlist
  INSERT INTO set_lists (id, name, date, notes, is_active, user_id, created_at)
  VALUES (gen_random_uuid(), 'Hip Hop & Rap', CURRENT_DATE, 'Hip hop and rap songs', false, user_id_val, NOW())
  RETURNING id INTO hip_hop_setlist_id;
  
  -- Reggae Setlist
  INSERT INTO set_lists (id, name, date, notes, is_active, user_id, created_at)
  VALUES (gen_random_uuid(), 'Reggae Vibes', CURRENT_DATE, 'Reggae and island music', false, user_id_val, NOW())
  RETURNING id INTO reggae_setlist_id;
  
  RAISE NOTICE 'Created setlists: Pop (%), Rock (%), Country (%), R&B (%), Disco (%), Hip Hop (%), Reggae (%)', 
    pop_setlist_id, rock_setlist_id, country_setlist_id, rb_soul_setlist_id, disco_funk_setlist_id, hip_hop_setlist_id, reggae_setlist_id;
  
  -- Now assign songs to setlists based on their genres
  
  -- Pop/Top40 songs
  position_counter := 1;
  FOR song_record IN 
    SELECT id, title, artist, genre 
    FROM songs 
    WHERE user_id = user_id_val 
      AND (genre ILIKE '%Pop%' OR genre ILIKE '%Top40%')
      AND genre NOT ILIKE '%Hip Hop%'
      AND genre NOT ILIKE '%Country%'
    ORDER BY title
  LOOP
    INSERT INTO set_list_songs (set_list_id, song_id, position, created_at)
    VALUES (pop_setlist_id, song_record.id, position_counter, NOW());
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Rock songs
  position_counter := 1;
  FOR song_record IN 
    SELECT id, title, artist, genre 
    FROM songs 
    WHERE user_id = user_id_val 
      AND (genre ILIKE '%Rock%' OR genre ILIKE '%Grunge%')
    ORDER BY title
  LOOP
    INSERT INTO set_list_songs (set_list_id, song_id, position, created_at)
    VALUES (rock_setlist_id, song_record.id, position_counter, NOW());
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Country songs
  position_counter := 1;
  FOR song_record IN 
    SELECT id, title, artist, genre 
    FROM songs 
    WHERE user_id = user_id_val 
      AND genre ILIKE '%Country%'
    ORDER BY title
  LOOP
    INSERT INTO set_list_songs (set_list_id, song_id, position, created_at)
    VALUES (country_setlist_id, song_record.id, position_counter, NOW());
    position_counter := position_counter + 1;
  END LOOP;
  
  -- R&B/Soul songs
  position_counter := 1;
  FOR song_record IN 
    SELECT id, title, artist, genre 
    FROM songs 
    WHERE user_id = user_id_val 
      AND (genre ILIKE '%R&B%' OR genre ILIKE '%Soul%' OR genre ILIKE '%Motown%')
      AND genre NOT ILIKE '%Hip Hop%'
    ORDER BY title
  LOOP
    INSERT INTO set_list_songs (set_list_id, song_id, position, created_at)
    VALUES (rb_soul_setlist_id, song_record.id, position_counter, NOW());
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Disco/Funk songs
  position_counter := 1;
  FOR song_record IN 
    SELECT id, title, artist, genre 
    FROM songs 
    WHERE user_id = user_id_val 
      AND (genre ILIKE '%Disco%' OR genre ILIKE '%Funk%' OR genre ILIKE '%Dance%')
    ORDER BY title
  LOOP
    INSERT INTO set_list_songs (set_list_id, song_id, position, created_at)
    VALUES (disco_funk_setlist_id, song_record.id, position_counter, NOW());
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Hip Hop songs
  position_counter := 1;
  FOR song_record IN 
    SELECT id, title, artist, genre 
    FROM songs 
    WHERE user_id = user_id_val 
      AND (genre ILIKE '%Hip Hop%' OR genre ILIKE '%Rap%' OR genre ILIKE '%Reggaeton%')
    ORDER BY title
  LOOP
    INSERT INTO set_list_songs (set_list_id, song_id, position, created_at)
    VALUES (hip_hop_setlist_id, song_record.id, position_counter, NOW());
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Reggae songs
  position_counter := 1;
  FOR song_record IN 
    SELECT id, title, artist, genre 
    FROM songs 
    WHERE user_id = user_id_val 
      AND (genre ILIKE '%Reggae%' OR genre ILIKE '%Dancehall%')
    ORDER BY title
  LOOP
    INSERT INTO set_list_songs (set_list_id, song_id, position, created_at)
    VALUES (reggae_setlist_id, song_record.id, position_counter, NOW());
    position_counter := position_counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Genre-based setlists created and songs assigned successfully!';
  
END $$;
