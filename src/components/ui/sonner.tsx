import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      expand={true}
      richColors
      closeButton
      visibleToasts={5}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-2xl rounded-2xl px-5 py-4 gap-3 min-w-[320px] max-w-[420px]",
          title: "text-base font-bold text-gray-900 dark:text-gray-50 leading-tight tracking-tight",
          description: "text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-1.5",
          success:
            "bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300/60 dark:border-emerald-700/60 shadow-emerald-200/50 dark:shadow-emerald-900/50",
          error:
            "bg-rose-50/95 dark:bg-rose-950/95 border-rose-300/60 dark:border-rose-700/60 shadow-rose-200/50 dark:shadow-rose-900/50",
          warning:
            "bg-amber-50/95 dark:bg-amber-950/95 border-amber-300/60 dark:border-amber-700/60 shadow-amber-200/50 dark:shadow-amber-900/50",
          info:
            "bg-sky-50/95 dark:bg-sky-950/95 border-sky-300/60 dark:border-sky-700/60 shadow-sky-200/50 dark:shadow-sky-900/50",
          actionButton:
            "h-9 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95",
          cancelButton:
            "h-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-all duration-200 active:scale-95",
          closeButton:
            "bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border-0 rounded-xl transition-all duration-200 active:scale-90 h-7 w-7",
        },
        style: {
          animation: "slide-in-from-top 0.3s cubic-bezier(0.21, 1.02, 0.73, 1)",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
