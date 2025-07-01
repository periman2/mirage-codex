'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, OpenNewWindow } from 'iconoir-react'
import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4">
      {/* Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(https://nxdsudkpprqhmvesftzp.supabase.co/storage/v1/object/public/app/background/marble_texture.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.1
        }}
      />
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 text-slate-700 dark:text-amber-100 hover:text-amber-700 dark:hover:text-amber-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 
            className="text-4xl md:text-6xl font-bold text-[#1f2630] dark:text-amber-100 leading-tight"
            style={{ fontFamily: 'var(--font-playfair-display), serif', letterSpacing: '0.05em' }}
          >
            About 
            <span style={{ color: 'rgb(217 119 6)' }}> MirageCodex</span>
          </h1>
          
          <div className="flex items-center justify-center">
            <div className="h-px opacity-20 w-16" style={{ backgroundColor: 'rgb(217 119 6)' }}></div>
          </div>
          
          <p
            className="text-lg md:text-xl text-slate-700 dark:text-amber-50 leading-relaxed font-light italic max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-playfair-display), serif' }}
          >
            The genesis of a simulacrum library
          </p>
        </div>

        {/* Main content */}
        <div className="space-y-8">
          {/* Origins section */}
          <div 
            className="backdrop-blur-sm bg-white/40 dark:bg-amber-950/20 rounded-2xl p-6 md:p-8 border"
            style={{ borderColor: 'rgba(217, 119, 6, 0.2)' }}
          >
            <h2 
              className="text-2xl md:text-3xl font-semibold mb-6 text-slate-900 dark:text-amber-100"
              style={{ fontFamily: 'var(--font-playfair-display), serif' }}
            >
              Origins & Inspiration
            </h2>
            
                        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed">
                MirageCodex was born from the convergence of two fascinating concepts that captured my imagination: 
                the ethereal nature of generative AI experiences and the infinite possibilities of procedural creation.
              </p>
              
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed">
                The first inspiration came from witnessing the emergence of generative AI games, particularly 
                <a 
                  href="https://en.wikipedia.org/wiki/Oasis_(Minecraft_clone)" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors inline-flex items-center"
                >
                  Oasis <OpenNewWindow className="w-3 h-3 ml-1" />
                </a>
                , a 2024 Minecraft clone that runs entirely on generative artificial intelligence. Created by Robert Wachen and Dean Leitersdorf, 
                Oasis uses "next-frame prediction" to anticipate player actions, trained on millions of hours of gameplay footage. 
                Without traditional memory or code, the game creates a dreamlike, unpredictable experience where scenery and 
                inventory can shift unexpectedly—a beautiful simulacrum of the original game.
              </p>
              
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed">
                The second inspiration came from the mesmerizing concept of the 
                <a 
                  href="https://libraryofbabel.info" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors inline-flex items-center"
                >
                  Library of Babel <OpenNewWindow className="w-3 h-3 ml-1" />
                </a>
                —an infinite digital library that contains every book that will ever be written. Through clever procedural 
                generation and mathematical principles, this library creates the bizarre and wonderful feeling of exploring 
                an truly infinite collection of texts, where every possible combination of characters exists somewhere in its vast halls.
              </p>
              
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed">
                I wanted to combine the simulacrum aspect of Oasis and similar AI-driven experiences with the sublime vertigo 
                of exploring an infinite library. What if we could create a literary universe that feels both infinite and alive, 
                where books emerge from the collective unconscious of artificial intelligence as you search for them?
              </p>
              
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed font-medium">
                And thus, <span style={{ color: 'rgb(217 119 6)' }}>MirageCodex</span> was born—a living archive that 
                generates literature in real-time, creating the sensation of discovering books that have always existed, 
                waiting to be found in the quantum superposition of possibility.
              </p>
            </div>
          </div>

          {/* Vision section */}
          <div 
            className="backdrop-blur-sm bg-white/40 dark:bg-amber-950/20 rounded-2xl p-6 md:p-8 border"
            style={{ borderColor: 'rgba(217, 119, 6, 0.2)' }}
          >
            <h2 
              className="text-2xl md:text-3xl font-semibold mb-6 text-slate-900 dark:text-amber-100"
              style={{ fontFamily: 'var(--font-playfair-display), serif' }}
            >
              The Philosophy
            </h2>
            
            <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed">
                Let me be clear: literature will never change in its fundamental nature. Human intention, emotion, and lived 
                experience will always remain the most significant forces in the context of true artform. MirageCodex doesn't 
                seek to replace human creativit, rather, it leans into the whimsical nature of exploration and feeds our 
                curiosity about what the latest generative AI models can accomplish in terms of raw creative output.
              </p>
              
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed">
                As much as anything, this is an arena for clashing AI model creativity and imaginative capabilities, a 
                gamified approach to using large language models for genuinely useful purposes. Consider the magical workflow 
                of "finding" recipes you love by generating cookbooks, bookmarking the pages that resonate with you, and 
                effortlessly sharing them with others. This feels refreshingly new and wonderfully practical.
              </p>
              
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed">
                The applications extend far beyond reading for pleasure. MirageCodex becomes a versatile tool for discovering 
                educational textbooks tailored to your learning style, generating technical documentation for complex projects, 
                creating mockup travel guides for imaginary destinations for your games or art projects, developing business frameworks 
                and startup guides, crafting language learning materials, producing fitness and wellness programs and many more.
              </p>
              
              <p className="text-slate-900 dark:text-amber-50 leading-relaxed">
                In truth, your imagination is the only limit. MirageCodex adapts to whatever creative or practical need you can envision.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 