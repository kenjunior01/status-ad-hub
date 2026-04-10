import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PrivacyProps {
  onNavigate?: (page: string) => void;
}

export const Privacy = ({ onNavigate }: PrivacyProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => onNavigate?.('index')}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">{t('footer.privacy')}</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly: name, email, profile details, payment information, and WhatsApp Status metrics. We also collect usage data such as page views, interactions, and device information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>Your information is used to: operate and improve the Platform, match creators with advertisers, process payments, send notifications, prevent fraud, and provide customer support.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Data Sharing</h2>
            <p>We share limited profile information (display name, niche, rating) publicly to facilitate the marketplace. Payment information is processed securely through third-party providers (PayPal, PaySuite, etc.) and is never stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
            <p>We implement industry-standard security measures including SSL encryption, secure authentication, and Row-Level Security policies to protect your data. All financial transactions use escrow-based systems for additional protection.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You can update your profile information at any time through your dashboard. To request data deletion, contact our support team.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Cookies & Analytics</h2>
            <p>We use essential cookies for authentication and session management. Analytics data is collected to improve the user experience. You can manage cookie preferences through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. International Data Transfers</h2>
            <p>As a global platform, your data may be transferred and processed in different countries. We ensure appropriate safeguards are in place for all international data transfers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
            <p>For privacy-related inquiries, contact us at privacy@statusmonetize.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
