import { ShieldCheck, Truck, Wrench, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const StoreTrustBar = () => {
  const { language } = useLanguage();

  const features = [
    {
      icon: ShieldCheck,
      title: language === "km" ? "ផលិតផលសុទ្ធ 100%" : "100% Genuine Guaranteed",
      desc: language === "km" ? "ធានាគុណភាពផ្លូវការពីហាង" : "Authentic Apple & top monitor gear",
      iconColor: "text-emerald-500 bg-emerald-500/10 group-hover:scale-110",
    },
    {
      icon: Truck,
      title: language === "km" ? "ដឹកជញ្ជូនរហ័សទាន់ចិត្ត" : "Fast & Secure Shipping",
      desc: language === "km" ? "ភ្នំពេញក្នុងថ្ងៃ និងទូទាំងប្រទេស" : "Same-day in PP & provinces nationwide",
      iconColor: "text-blue-500 bg-blue-500/10 group-hover:scale-110",
    },
    {
      icon: Wrench,
      title: language === "km" ? "ជំនួយបច្ចេកទេស & ដំឡើង" : "Free Expert Setup",
      desc: language === "km" ? "សេវាពិនិត្យ និងដំឡើងកម្មវិធីឥតគិតថ្លៃ" : "Complimentary OS & software assistance",
      iconColor: "text-amber-500 bg-amber-500/10 group-hover:scale-110",
    },
    {
      icon: CreditCard,
      title: language === "km" ? "ទូទាត់ងាយស្រួល & សុវត្ថិភាព" : "Flexible KHQR & Cash",
      desc: language === "km" ? "ABA Pay, Bakong KHQR & Cash" : "ABA Pay, Bakong KHQR & Cash accepted",
      iconColor: "text-purple-500 bg-purple-500/10 group-hover:scale-110",
    },
  ];

  return (
    <div className="my-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className="group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl bg-card border border-border/60 shadow-xs hover:border-primary/40 hover:-translate-y-1 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 ease-out cursor-default"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 ${f.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">{f.title}</h4>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
