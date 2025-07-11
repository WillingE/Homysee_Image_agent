import React, { useState, useEffect } from 'react';
import { Search, Plus, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useCredits } from '@/hooks/useCredits';

const AdminCredits = () => {
  const { users, loading, fetchAllUsers, searchUsers, topUpCredits } = useCredits();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      searchUsers(value);
    } else {
      fetchAllUsers();
    }
  };

  const handleTopUp = async () => {
    if (!selectedUser || !topUpAmount) return;
    
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;

    const success = await topUpCredits(selectedUser.user_id, amount);
    if (success) {
      setIsTopUpOpen(false);
      setTopUpAmount('');
      setSelectedUser(null);
    }
  };

  const openTopUpDialog = (user: any) => {
    setSelectedUser(user);
    setIsTopUpOpen(true);
  };

  const calculateCredits = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return 0;
    return Math.floor(num / 0.8);
  };

  return (
    <div className="min-h-screen bg-chat-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">积分管理</h1>
            <p className="text-muted-foreground mt-2">管理用户积分余额和充值记录</p>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="bg-chat-surface border-message-border">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索用户邮箱或用户名..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-chat-surface border-message-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              用户积分列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ai-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">加载中...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邮箱</TableHead>
                    <TableHead>用户名</TableHead>
                    <TableHead>当前余额</TableHead>
                    <TableHead>总充值</TableHead>
                    <TableHead>总消费</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.username || '未设置'}</TableCell>
                      <TableCell>
                        <span className="font-medium text-ai-primary">
                          {user.current_balance} credits
                        </span>
                      </TableCell>
                      <TableCell>{user.total_earned}</TableCell>
                      <TableCell>{user.total_spent}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openTopUpDialog(user)}
                          className="bg-ai-primary hover:bg-ai-primary/90"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          充值
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? '未找到匹配的用户' : '暂无用户数据'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Up Dialog */}
        <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
          <DialogContent className="bg-chat-surface border-message-border">
            <DialogHeader>
              <DialogTitle>充值积分</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedUser && (
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">充值用户</p>
                  <p className="font-medium">{selectedUser.email}</p>
                  <p className="text-sm text-muted-foreground">
                    当前余额: {selectedUser.current_balance} credits
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="amount">充值金额 (元)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="请输入充值金额"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
                {topUpAmount && (
                  <p className="text-sm text-muted-foreground">
                    将获得: {calculateCredits(topUpAmount)} credits (汇率: ¥0.8 = 1 credit)
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsTopUpOpen(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleTopUp}
                  disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
                  className="bg-ai-primary hover:bg-ai-primary/90"
                >
                  确认充值
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminCredits;