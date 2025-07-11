import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserCredit {
  user_id: string;
  email: string;
  username: string;
  current_balance: number;
  total_earned: number;
  total_spent: number;
  credit_created_at: string;
  credit_updated_at: string;
}

export const useCredits = () => {
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_with_credits');
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      fetchAllUsers();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_users_with_credits', {
        search_term: searchTerm
      });
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const topUpCredits = async (userId: string, amount: number) => {
    try {
      // Calculate credits: 0.8 yuan = 1 credit
      const credits = Math.floor(amount / 0.8);
      
      const { data, error } = await supabase.rpc('update_user_credit_balance', {
        p_user_id: userId,
        p_amount: credits,
        p_transaction_type: 'admin_topup',
        p_description: `管理员充值: ¥${amount} = ${credits} credits`
      });

      if (error) throw error;
      if (!data) throw new Error('充值失败');

      toast({
        title: "充值成功",
        description: `成功充值 ${credits} credits`,
      });

      // Refresh the user list
      fetchAllUsers();
      return true;
    } catch (error: any) {
      toast({
        title: "充值失败",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    users,
    loading,
    fetchAllUsers,
    searchUsers,
    topUpCredits
  };
};