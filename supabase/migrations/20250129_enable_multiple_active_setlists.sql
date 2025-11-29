/*
  Enable Multiple Active SetLists
  
  This migration removes the database trigger that enforces only one active setlist,
  allowing multiple setlists to be active simultaneously.
*/

-- Drop the existing trigger that enforces single active setlist
DROP TRIGGER IF EXISTS handle_set_list_activation_trigger ON set_lists;

-- Drop the function that enforces single active setlist
DROP FUNCTION IF EXISTS handle_set_list_activation();

-- The is_active column remains as a boolean, but now multiple setlists can be active
-- No additional constraints needed - the application will handle multiple active setlists
