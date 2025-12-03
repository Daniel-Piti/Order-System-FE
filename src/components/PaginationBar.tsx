interface PaginationBarProps {
  currentPage: number; // 0-based
  totalPages: number;
  onPageChange: (page: number) => void;
  maxWidth?: string; // Tailwind max-width class
  showCondition?: boolean; // Condition to show/hide pagination
  sidebarOffset?: boolean; // Whether to add lg:left-64 offset for sidebar
  fixed?: boolean; // Whether to use fixed positioning (default: true)
  rtl?: boolean; // Whether the layout is right-to-left (default: false)
}

export default function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  maxWidth = 'max-w-6xl',
  showCondition = true,
  sidebarOffset = true,
  fixed = true,
  rtl = false,
}: PaginationBarProps) {
  if (!showCondition || totalPages === 0) {
    return null;
  }

  // Build the pages array to display - compact format: first, prev, current, next, last
  const pagesToShow: Array<number | 'ellipsis'> = [];
  
  // Collect unique pages to show
  const pagesSet = new Set<number>();
  
  // Always show first page
  pagesSet.add(0);
  
  // Always show last page
  pagesSet.add(totalPages - 1);
  
  // Show previous page (if exists and not already added)
  if (currentPage > 0) {
    pagesSet.add(currentPage - 1);
  }
  
  // Show current page (if not already added)
  pagesSet.add(currentPage);
  
  // Show next page (if exists and not already added)
  if (currentPage < totalPages - 1) {
    pagesSet.add(currentPage + 1);
  }
  
  // Convert to sorted array
  const sortedPages = Array.from(pagesSet).sort((a, b) => a - b);
  
  // Build final array with ellipsis
  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];
    const prevPage = i > 0 ? sortedPages[i - 1] : -1;
    
    // Add ellipsis if there's a gap
    if (prevPage >= 0 && page - prevPage > 1) {
      pagesToShow.push('ellipsis');
    }
    
    pagesToShow.push(page);
  }

  const containerClasses = fixed
    ? `fixed bottom-0 left-0 right-0 ${sidebarOffset ? 'lg:left-64' : ''} bg-white/85 backdrop-blur-sm pt-3 pb-3 border-t border-gray-300/30 shadow-lg z-40`
    : `glass-card rounded-3xl py-4 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm`;

  return (
    <div className={containerClasses}>
      <div className={`${maxWidth} mx-auto px-6`}>
        <div className="flex flex-col items-center gap-1.5">
          {/* Page Info - Above */}
          {fixed && (
            <div className="text-xs text-gray-600 font-medium">
              Page
            </div>
          )}

          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-1 flex-nowrap overflow-x-auto" dir={rtl ? 'rtl' : 'ltr'}>
            {/* Previous button */}
            {totalPages > 1 && (
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                </svg>
              </button>
            )}

            {/* Page numbers */}
            {pagesToShow.map((item, index) => {
              if (item === 'ellipsis') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={item}
                  onClick={() => onPageChange(item)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    currentPage === item
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'glass-button text-gray-800 hover:shadow-md'
                  }`}
                >
                  {item + 1}
                </button>
              );
            })}

            {/* Next button */}
            {totalPages > 1 && (
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
