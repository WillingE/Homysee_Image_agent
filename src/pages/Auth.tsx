import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { Sparkles, Zap } from 'lucide-react';

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // 如果用户已登录，重定向到主页
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "登录失败",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "登录成功",
        description: "欢迎回到 AI 智能修图助手"
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: "注册失败",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "注册成功",
        description: "请查看邮箱确认账户"
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-chat-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ai-primary to-ai-secondary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">AI 智能修图</h1>
          </div>
          <p className="text-muted-foreground">
            智能对话，精准修图，让创意触手可及
          </p>
        </div>

        <Card className="bg-chat-surface border-message-border shadow-shadow-elegant">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-foreground">欢迎使用</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              请登录或注册开始您的智能修图之旅
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger value="signin" className="data-[state=active]:bg-ai-primary data-[state=active]:text-white">
                  登录
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-ai-primary data-[state=active]:text-white">
                  注册
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">邮箱</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="输入您的邮箱"
                      required
                      className="bg-background border-border focus:border-ai-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">密码</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="输入您的密码"
                      required
                      className="bg-background border-border focus:border-ai-primary"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    variant="ai"
                    disabled={loading}
                  >
                    {loading ? "登录中..." : "登录"}
                    <Zap className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">邮箱</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="输入您的邮箱"
                      required
                      className="bg-background border-border focus:border-ai-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">密码</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="设置密码 (至少6位)"
                      required
                      minLength={6}
                      className="bg-background border-border focus:border-ai-primary"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    variant="ai"
                    disabled={loading}
                  >
                    {loading ? "注册中..." : "注册账户"}
                    <Sparkles className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;