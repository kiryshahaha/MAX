import { getAdminSupabase } from "../../lib/supabase-client";

export const userService = {
  async createOrUpdateUser(username, password) {
    try {

 const adminSupabase = getAdminSupabase();

      let email = this.isValidEmail(username) ? username : `${username}@guap-temp.com`;
      
      const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers();
      if (listError) throw listError;
      
      const existingUser = users.find(u => u.email === email);
      
      if (existingUser) {
        const { data: updatedUser, error: updateError } = await adminSupabase.auth.admin.updateUserById(
          existingUser.id,
          {
            password: password,
            user_metadata: {
              ...existingUser.user_metadata,
              username,
              original_username: username,
              last_login: new Date().toISOString()
            }
          }
        );

        if (updateError) throw updateError;
        
        return { user: updatedUser, updated: true, userId: existingUser.id };
      } else {
        const { data: user, error: createError } = await adminSupabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { 
            username,
            original_username: username,
            last_login: new Date().toISOString()
          }
        });

        if (createError) throw createError;

        return { user, created: true, userId: user.id };
      }
      
    } catch (error) {
      console.error('Ошибка создания/обновления пользователя:', error);
      throw error;
    }
  },

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};