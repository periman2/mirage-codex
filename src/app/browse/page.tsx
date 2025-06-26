import { Suspense } from 'react'
import { BookGrid } from '@/components/book-grid'
import { BrowseFilters } from '@/components/browse-filters'
import { RandomizeButton } from '@/components/randomize-button'
import { Card, CardContent } from '@/components/ui/card'

export default function BrowsePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Browse Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Browse Library</h1>
            <p className="text-slate-600 dark:text-slate-400">Discover books from the infinite collection</p>
          </div>
          <RandomizeButton variant="outline" />
        </div>

        <Suspense fallback={<BrowseFilters />}>
          <BrowseFilters />
        </Suspense>

        <Suspense fallback={<BookGridSkeleton />}>
          <BookGrid />
        </Suspense>
      </section>
    </div>
  )
}

function BookGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 rounded-t-lg" />
          <CardContent className="p-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 