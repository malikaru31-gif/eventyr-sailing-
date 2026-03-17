export default function SiteFooter() {
  return (
    <footer className="w-full border-t bg-white">
      <div className="w-full min-w-0 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-600">
            © {new Date().getFullYear()} Eventyr Sailing Logistics
          </div>
          <div className="text-sm text-neutral-600 flex flex-wrap gap-x-2 gap-y-1 items-center">
            <a href="/support" className="hover:underline">
              Support
            </a>
            <span>•</span>
            <a href="/privacy" className="hover:underline">
              Privacy
            </a>
            <span>•</span>
            <a href="/policies" className="hover:underline">
              Policies
            </a>
            <span>•</span>
            <a
              href="https://www.eventyrperformance.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              Eventyr Performance ↗
            </a>
            <span>•</span>
            EU only • Built for regatta logistics
          </div>
        </div>
      </div>
    </footer>
  );
}
