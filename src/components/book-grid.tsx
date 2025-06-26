'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Book, User, Clock } from 'iconoir-react'
import { useState } from 'react'

// Mock book data - in real app this would come from the database
const mockBooks = [
  {
    id: '1',
    title: 'The Whispered Geometries',
    author: 'Lysander Vex',
    summary: 'A mathematician discovers that reality itself follows impossible equations, leading to a journey through dimensions where logic bends.',
    pageCount: 342,
    coverUrl: null,
    language: 'English',
    genre: 'Science Fiction',
    tags: ['philosophical', 'mathematical', 'mind-bending'],
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'Shadows of the Crimson Moon',
    author: 'Evangeline Thorne',
    summary: 'In a world where the moon bleeds light, a young sorceress must master her forbidden magic to save her dying realm.',
    pageCount: 428,
    coverUrl: null,
    language: 'English',
    genre: 'Fantasy',
    tags: ['dark', 'magical', 'epic'],
    createdAt: '2024-01-12',
  },
  {
    id: '3',
    title: 'The Last Bookkeeper',
    author: 'Marcus Silverton',
    summary: 'After all digital records vanish, one librarian becomes humanity\'s sole keeper of written knowledge in a post-digital wasteland.',
    pageCount: 287,
    coverUrl: null,
    language: 'English',
    genre: 'Dystopian Fiction',
    tags: ['post-apocalyptic', 'philosophical', 'literary'],
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    title: 'Καθρέφτες της Ψυχής',
    author: 'Αριάδνη Κάλλιστος',
    summary: 'Μια ψυχοπομπός ανακαλύπτει ότι οι καθρέφτες δεν αντανακλούν εικόνες αλλά αναμνήσεις από παράλληλες ζωές.',
    pageCount: 195,
    coverUrl: null,
    language: 'Greek',
    genre: 'Magical Realism',
    tags: ['philosophical', 'mystical', 'introspective'],
    createdAt: '2024-01-08',
  },
  {
    id: '5',
    title: 'L\'Écho des Horloges Perdues',
    author: 'Céleste Dubois',
    summary: 'Dans un Paris où le temps s\'est fracturé, une horlogère doit réparer les mécanismes temporels avant que la réalité ne s\'effondre.',
    pageCount: 356,
    coverUrl: null,
    language: 'French',
    genre: 'Steampunk',
    tags: ['temporal', 'mechanical', 'romantic'],
    createdAt: '2024-01-05',
  },
  {
    id: '6',
    title: 'El Jardín de Memorias Rotas',
    author: 'Isabella Montemayor',
    summary: 'Una neurocientífica descubre que los recuerdos perdidos no desaparecen, sino que crecen como flores en un jardín interdimensional.',
    pageCount: 298,
    coverUrl: null,
    language: 'Spanish',
    genre: 'Science Fiction',
    tags: ['memory', 'psychological', 'lyrical'],
    createdAt: '2024-01-03',
  },
  {
    id: '7',
    title: 'The Cartographer of Dreams',
    author: 'Ophelia Nightingale',
    summary: 'A dream researcher learns to map the geography of sleeping minds, only to discover nightmares have their own twisted logic.',
    pageCount: 412,
    coverUrl: null,
    language: 'English',
    genre: 'Horror',
    tags: ['psychological', 'surreal', 'dark'],
    createdAt: '2024-01-01',
  },
  {
    id: '8',
    title: 'Quantum Hearts',
    author: 'Dr. Amara Chen',
    summary: 'Two physicists fall in love across parallel universes, communicating only through quantum entanglement experiments.',
    pageCount: 267,
    coverUrl: null,
    language: 'English',
    genre: 'Romance',
    tags: ['scientific', 'romantic', 'parallel-worlds'],
    createdAt: '2023-12-28',
  },
]

function generateCoverGradient(bookId: string) {
  // Generate a consistent gradient based on book ID
  const gradients = [
    'from-purple-400 to-pink-400',
    'from-blue-400 to-purple-400',
    'from-green-400 to-blue-400',
    'from-yellow-400 to-orange-400',
    'from-red-400 to-pink-400',
    'from-indigo-400 to-purple-400',
    'from-teal-400 to-green-400',
    'from-orange-400 to-red-400',
  ]
  
  const index = parseInt(bookId, 10) % gradients.length
  return gradients[index]
}

export function BookGrid() {
  const [books] = useState(mockBooks)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {books.map((book) => (
        <Card key={book.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          {/* Book Cover */}
          <div className={`aspect-[3/4] bg-gradient-to-br ${generateCoverGradient(book.id)} rounded-t-lg flex items-center justify-center relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
            <div className="text-center p-4 relative z-10">
              <Book className="w-12 h-12 text-white/80 mx-auto mb-2" />
              <h3 className="text-white font-bold text-sm leading-tight line-clamp-3">
                {book.title}
              </h3>
            </div>
          </div>

          {/* Book Info */}
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {book.title}
                </h4>
                <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 mt-1">
                  <User className="w-3 h-3" />
                  <span>{book.author}</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                {book.summary}
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{book.pageCount} pages</span>
                <span>•</span>
                <span>{book.language}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {book.genre}
                </Badge>
                {book.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {book.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{book.tags.length - 2}
                  </Badge>
                )}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3 group-hover:bg-slate-50 dark:group-hover:bg-slate-800"
              >
                Read Book
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 