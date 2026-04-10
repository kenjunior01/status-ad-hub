import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TermsProps {
  onNavigate?: (page: string) => void;
}

export const Terms = ({ onNavigate }: TermsProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => onNavigate?.('index')}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">{t('footer.terms')}</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using the StatusAds Connect platform ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Platform Description</h2>
            <p>StatusAds Connect is a marketplace that connects content creators with advertisers for WhatsApp Status advertising campaigns. The Platform facilitates campaign creation, creator discovery, payment processing, and performance tracking.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p>Users must register with accurate information. You are responsible for maintaining the confidentiality of your account credentials. The Platform supports two primary roles: Creators and Advertisers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Payments & Fees</h2>
            <p>The Platform charges an 18% commission on each transaction. Payments are held in escrow until campaign completion and verification. Creators can withdraw earnings once the minimum threshold is met. Supported payment methods include PayPal, PaySuite (M-Pesa/e-Mola), Multicaixa Express, and PIX.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Content Guidelines</h2>
            <p>All content published through the Platform must comply with applicable laws and WhatsApp's terms of service. Creators are limited to 3 ads per day with a minimum 4-hour interval between posts. The Platform reserves the right to remove content that violates these guidelines.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Dispute Resolution</h2>
            <p>Disputes between creators and advertisers are handled through the Platform's built-in dispute resolution system. An administrator will review and mediate conflicts. Escrow funds are held until resolution.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>StatusAds Connect acts as an intermediary and is not responsible for the content posted by creators or the quality of advertising services. The Platform is provided "as is" without warranties of any kind.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
            <p>For questions about these terms, contact us at support@statusmonetize.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
