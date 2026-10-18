import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { User, UserX } from "lucide-react";

interface GuestCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAccount: () => void;
  onSelectGuest: () => void;
}

const GuestCheckoutDialog = ({ open, onOpenChange, onSelectAccount, onSelectGuest }: GuestCheckoutDialogProps) => {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-5 sm:p-6">
        <DialogHeader className="p-0 pb-3 pr-8">
          <DialogTitle className="text-base font-bold">
            {language === "km" ? "របៀបបង់ប្រាក់" : "How would you like to checkout?"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {language === "km"
              ? "សូមជ្រើសរើសបង់ប្រាក់ដោយគណនី ឬជាភ្ញៀវ"
              : "Sign in for order history, or continue as a guest"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 pt-2">
          <Button className="w-full gap-2.5 h-11 text-sm font-semibold rounded-xl" onClick={onSelectAccount}>
            <User className="w-4 h-4" />
            {language === "km" ? "បង់ប្រាក់ជាមួយគណនី" : "Checkout with Account"}
          </Button>
          <Button variant="outline" className="w-full gap-2.5 h-11 text-sm font-semibold rounded-xl" onClick={onSelectGuest}>
            <UserX className="w-4 h-4" />
            {language === "km" ? "បង់ប្រាក់ជាភ្ញៀវ" : "Continue as Guest"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestCheckoutDialog;
