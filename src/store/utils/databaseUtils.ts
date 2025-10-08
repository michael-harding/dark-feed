import { DataLayer } from '@/services/dataLayer';
import { supabase } from '@/integrations/supabase/client';

export const withUserCheck = async <T>(
  operation: (userId: string) => Promise<T>,
  defaultValue: T
): Promise<T> => {
  try {
    // Use the supabase client directly to get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return defaultValue;
    return await operation(user.id);
  } catch (error) {
    console.error('Database operation error:', error);
    return defaultValue;
  }
};

export const createDatabaseUpdater = <T extends { id: string }>(
  tableName: string,
  updateFields: (keyof T)[]
) => {
  return async (data: T): Promise<void> => {
    await withUserCheck(async (userId) => {
      const updateData = {
        id: data.id,
        user_id: userId,
        ...Object.fromEntries(
          updateFields.map(field => [field, data[field]])
        )
      };

      const { error } = await supabase
        .from(tableName)
        .upsert(updateData);

      if (error) {
        console.error(`Error updating ${tableName}:`, error);
      }
    }, undefined);
  };
};