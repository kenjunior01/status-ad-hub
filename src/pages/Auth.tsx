import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Shield, Users, TrendingUp } from "lucide-react";
import { LoginForm, SignupForm, ResetPasswordForm } from "@/components/AuthForms";
import type { Session, User } from '@supabase/supabase-js';

interface AuthProps {
  onNavigate: (page: string) => void;
}

const Auth = ({ onNavigate }: AuthProps) => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            try {
              const { data: roleData } = await supabase
                .rpc('get_user_role', { _user_id: session.user.id });
              
              if (roleData === 'admin') onNavigate('admin-dashboard');
              else if (roleData === 'creator') onNavigate('creator-dashboard');
              else if (roleData === 'advertiser') onNavigate('advertiser-dashboard');
              else onNavigate('index');
            } catch {
              onNavigate('index');
            }
          }, 100);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [onNavigate]);

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-muted border-t-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-foreground mb-1">{t('common.loading')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/15 via-background to-primary/5 relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-[15%] right-[8%] w-48 h-48 bg-primary/8 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[50%] right-[15%] w-32 h-32 bg-primary/4 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <Card className="shadow-2xl border border-border/30 bg-card/95 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <MessageCircle className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              StatusAds Connect
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t('hero.title')}
            </CardDescription>
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            {showResetPassword ? (
              <ResetPasswordForm onBack={() => setShowResetPassword(false)} />
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-5 h-10 bg-muted/40 rounded-xl p-1">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg text-sm font-medium transition-all"
                  >
                    {t('auth.login')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg text-sm font-medium transition-all"
                  >
                    {t('auth.register')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <LoginForm
                    onShowPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    loading={loading}
                  />
                  <div className="mt-3 text-center">
                    <Button
                      variant="link"
                      className="text-xs text-muted-foreground hover:text-primary p-0 h-auto"
                      onClick={() => setShowResetPassword(true)}
                    >
                      {t('auth.forgotPassword')}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <SignupForm
                    onShowPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    loading={loading}
                  />
                </TabsContent>
              </Tabs>
            )}

            <div className="mt-5 text-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate('index')}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                ← {t('common.back')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trust bar */}
        <div className="mt-6 text-center">
          <div className="flex justify-center items-center gap-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>{t('trust.securePayment')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{t('trust.verifiedCreators')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>Escrow</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
