import React, { useState } from 'react';
import { GraduationCap, BookOpen, Play, Clock, Star, Trophy, Users, ArrowRight, Search, Filter, Book, Sparkles, TrendingUp, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Link } from 'react-router';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  rating: number;
  students: number;
  image: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

const COURSES: Course[] = [
  {
    id: '1',
    title: 'Solo Business 101: The Foundation',
    description: 'Learn the essential building blocks of a successful one-person business.',
    instructor: 'Alex Rivera',
    duration: '6h 45m',
    rating: 4.9,
    students: 1204,
    image: 'https://picsum.photos/seed/business/800/600',
    category: 'Business',
    level: 'Beginner'
  },
  {
    id: '2',
    title: 'AI-Powered Productivity for Founders',
    description: 'Master the tools and workflows to do the work of a 10-person team.',
    instructor: 'Sarah Chen',
    duration: '4h 20m',
    rating: 4.8,
    students: 856,
    image: 'https://picsum.photos/seed/ai/800/600',
    category: 'Technology',
    level: 'Intermediate'
  },
  {
    id: '3',
    title: 'High-Conversion Sales for Introverts',
    description: 'A non-pushy approach to closing deals and building lasting client relationships.',
    instructor: 'Marcus Thorne',
    duration: '5h 15m',
    rating: 4.7,
    students: 642,
    image: 'https://picsum.photos/seed/sales/800/600',
    category: 'Sales',
    level: 'Beginner'
  },
  {
    id: '4',
    title: 'Advanced Content Orchestration',
    description: 'Scale your content marketing without burning out using systemic workflows.',
    instructor: 'Elena Vance',
    duration: '8h 30m',
    rating: 4.9,
    students: 432,
    image: 'https://picsum.photos/seed/content/800/600',
    category: 'Marketing',
    level: 'Advanced'
  }
];

export function SoloSuccessAcademy() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const categories = ['All', 'Business', 'Technology', 'Marketing', 'Sales', 'Design'];

  const filteredCourses = COURSES.filter(course => {
    const matchesCategory = activeCategory === 'All' || course.category === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-24 pb-20 font-mono">
      {/* Hero Section */}
      <div className="relative bg-black border-[12px] border-black p-12 lg:p-24 overflow-hidden shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] -rotate-1">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-40 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_#ff00ff_0%,_transparent_70%)]"></div>
          <div className="grid grid-cols-6 gap-6 rotate-12 translate-x-20">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-square bg-[#00FFFF]/20 border-4 border-[#00FFFF]/40" />
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-3 bg-[#FFFF00] border-8 border-black px-8 py-3 text-black font-black uppercase italic tracking-widest mb-12 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles className="w-6 h-6 stroke-[3px]" />
            <span className="text-xl">THE BRAIN CAVE: TROLL ACADEMY</span>
          </div>
          <h1 className="text-8xl lg:text-[10rem] font-black text-white uppercase italic leading-[0.85] mb-12 tracking-tighter drop-shadow-[12px_12px_0px_#ff00ff]">
            MASTER THE ART OF <span className="text-[#00FF00]">GOING SOLO.</span>
          </h1>
          <p className="text-3xl font-black uppercase italic tracking-widest text-white/80 mb-20 leading-tight max-w-2xl bg-black/40 p-6 border-4 border-white/20">
            EXPERT-LED SCROLLS DESIGNED SPECIFICALLY FOR LEGENDARY TROLLS, INDIE HACKERS, AND SOLO CHIEFS.
          </p>
          <div className="flex flex-wrap gap-10">
            <button className="bg-[#00FF00] border-8 border-black text-black px-12 py-6 font-black text-3xl uppercase italic shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-4">
              EXPLORE SCROLLS <ArrowRight className="w-10 h-10 stroke-[4px]" />
            </button>
            <Link to="/challenges" className="bg-white border-8 border-black text-black px-12 py-6 font-black text-3xl uppercase italic shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-4">
              VIEW CHALLENGES
            </Link>
          </div>
        </div>
      </div>

      {/* Learning Paths */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        {[
          { title: 'The Launchpad', description: 'Everything you need to start your solo journey.', icon: Play, color: 'bg-[#00FFFF]' },
          { title: 'Growth Engine', description: 'Scale your revenue and automate your operations.', icon: TrendingUp, color: 'bg-[#00FF00]' },
          { title: 'Mastery Circle', description: 'Advanced strategies for high-impact soloists.', icon: Trophy, color: 'bg-[#FF00FF]' },
        ].map((path, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -15, rotate: i % 2 === 0 ? 3 : -3 }}
            className="bg-white border-[10px] border-black p-12 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] group cursor-pointer relative overflow-hidden"
          >
            <div className={cn("w-24 h-24 border-8 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-12 rotate-3 group-hover:rotate-0 transition-transform", path.color)}>
              <path.icon className="w-12 h-12 text-black stroke-[3px]" />
            </div>
            <h3 className="text-4xl font-black text-black uppercase italic mb-8 tracking-tighter leading-none">{path.title}</h3>
            <p className="text-black font-bold text-xl leading-relaxed mb-12 italic">"{path.description}"</p>
            <div className="flex items-center text-lg font-black uppercase italic tracking-widest text-black group-hover:text-[#FF00FF] transition-colors">
              START PATH <ArrowRight className="w-6 h-6 ml-4 group-hover:translate-x-4 transition-transform stroke-[3px]" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Course Explorer */}
      <div className="space-y-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-12">
          <div className="flex flex-wrap gap-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "border-8 border-black px-10 py-4 font-black uppercase italic text-lg tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all",
                  activeCategory === cat 
                    ? "bg-[#FF00FF] text-white" 
                    : "bg-white text-black"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-[500px]">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 text-black stroke-[3px]" />
            <input 
              type="text"
              placeholder="SEARCH SCROLLS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-[10px] border-black pl-20 pr-8 py-6 font-black uppercase italic text-2xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:bg-[#00FFFF]/10 transition-all outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          {filteredCourses.map((course, index) => (
            <motion.div 
              key={course.id}
              layout
              onClick={() => setSelectedCourse(course)}
              className={cn(
                "bg-white border-8 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] group cursor-pointer hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all",
                index % 2 === 0 ? "rotate-1" : "-rotate-1"
              )}
            >
              <div className="aspect-[4/3] relative border-b-8 border-black overflow-hidden">
                <img 
                  src={course.image} 
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-6 left-6">
                  <span className="bg-[#FFFF00] border-4 border-black px-4 py-2 text-xs font-black uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    {course.category}
                  </span>
                </div>
              </div>
              <div className="p-10">
                <div className="flex items-center gap-6 text-sm font-black uppercase italic text-black/50 mb-8 tracking-widest">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 stroke-[3px]" /> {course.duration}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-[#FF00FF] fill-[#FF00FF] stroke-[3px]" /> {course.rating}
                  </div>
                </div>
                <h3 className="text-3xl font-black text-black uppercase italic mb-8 tracking-tighter leading-none group-hover:text-[#FF00FF] transition-colors line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-black font-bold text-lg line-clamp-2 mb-12 italic leading-tight">
                  "{course.description}"
                </p>
                <div className="flex items-center justify-between pt-10 border-t-8 border-black">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FF00FF] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-lg font-black text-white italic">
                      {course.instructor[0]}
                    </div>
                    <span className="text-xs font-black uppercase italic tracking-widest text-black/60">{course.instructor}</span>
                  </div>
                  <span className={cn(
                    "border-4 border-black px-4 py-2 text-[10px] font-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    course.level === 'Beginner' ? "bg-[#00FF00]" :
                    course.level === 'Intermediate' ? "bg-[#00FFFF]" : "bg-[#FF00FF] text-white"
                  )}>
                    {course.level}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Community Section */}
      <div className="bg-[#FFFF00] border-[12px] border-black p-12 lg:p-24 flex flex-col lg:flex-row items-center gap-24 shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] rotate-1">
        <div className="lg:w-1/2 space-y-12">
          <h2 className="text-7xl font-black text-black uppercase italic leading-[0.9] tracking-tighter drop-shadow-[8px_8px_0px_#ff00ff]">LEARN TOGETHER, GROW FASTER.</h2>
          <p className="text-3xl font-black italic leading-tight text-black/80">
            "JOIN STUDY TRIBES, PARTICIPATE IN LEGENDARY CHALLENGES, AND CONNECT WITH FELLOW TROLLS WHO ARE ON THE SAME PATH TO GLORY."
          </p>
          <div className="flex gap-8">
            <Link to="/academy-groups" className="bg-black border-8 border-black text-white px-12 py-6 font-black text-3xl uppercase italic shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-4">
              JOIN A STUDY TRIBE <Users className="w-10 h-10 stroke-[3px]" />
            </Link>
          </div>
        </div>
        <div className="lg:w-1/2 grid grid-cols-2 gap-12">
          <div className="bg-white border-[10px] border-black p-12 rotate-2 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-20 h-20 bg-[#00FFFF] border-8 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-10">
              <Users className="w-10 h-10 text-black stroke-[3px]" />
            </div>
            <p className="text-6xl font-black text-black uppercase italic tracking-tighter">42+</p>
            <p className="text-sm font-black uppercase italic tracking-widest text-black/60 mt-4">ACTIVE STUDY TRIBES</p>
          </div>
          <div className="bg-white border-[10px] border-black p-12 -rotate-2 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-20 h-20 bg-[#00FF00] border-8 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-10">
              <Trophy className="w-10 h-10 text-black stroke-[3px]" />
            </div>
            <p className="text-6xl font-black text-black uppercase italic tracking-tighter">12</p>
            <p className="text-sm font-black uppercase italic tracking-widest text-black/60 mt-4">LEGENDARY CHALLENGES</p>
          </div>
          <div className="bg-white border-[10px] border-black p-12 -rotate-1 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-20 h-20 bg-[#FF00FF] border-8 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-10">
              <Book className="w-10 h-10 text-white stroke-[3px]" />
            </div>
            <p className="text-6xl font-black text-black uppercase italic tracking-tighter">150+</p>
            <p className="text-sm font-black uppercase italic tracking-widest text-black/60 mt-4">SCROLLS AVAILABLE</p>
          </div>
          <div className="bg-white border-[10px] border-black p-12 rotate-1 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-20 h-20 bg-[#FF6B00] border-8 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-10">
              <Star className="w-10 h-10 text-white stroke-[3px]" />
            </div>
            <p className="text-6xl font-black text-black uppercase italic tracking-tighter">4.9/5</p>
            <p className="text-sm font-black uppercase italic tracking-widest text-black/60 mt-4">AVERAGE VIBE</p>
          </div>
        </div>
      </div>

      {/* Course Preview Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white border-[16px] border-black w-full max-w-6xl max-h-[90vh] p-0 overflow-hidden flex flex-col shadow-[32px_32px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="relative h-[400px] lg:h-[500px] border-b-[16px] border-black">
                <img 
                  src={selectedCourse.image} 
                  alt={selectedCourse.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedCourse(null)}
                  className="absolute top-10 right-10 p-6 bg-white border-8 border-black hover:bg-[#FF00FF] transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-2 active:translate-y-2"
                >
                  <X className="w-12 h-12 stroke-[4px]" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-16 bg-gradient-to-t from-black to-transparent text-white">
                  <div className="flex items-center gap-8 mb-8">
                    <span className="bg-[#FFFF00] border-8 border-black px-6 py-3 text-sm font-black uppercase italic text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      {selectedCourse.category}
                    </span>
                    <span className={cn(
                      "border-8 border-black px-6 py-3 text-sm font-black uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                      selectedCourse.level === 'Beginner' ? "bg-[#00FF00] text-black" :
                      selectedCourse.level === 'Intermediate' ? "bg-[#00FFFF] text-black" : "bg-[#FF00FF] text-white"
                    )}>
                      {selectedCourse.level}
                    </span>
                  </div>
                  <h2 className="text-6xl lg:text-8xl font-black uppercase italic tracking-tighter leading-none drop-shadow-[8px_8px_0px_#ff00ff]">{selectedCourse.title}</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-16 lg:p-24 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-24">
                  <div className="lg:col-span-2 space-y-20">
                    <div>
                      <h3 className="text-5xl font-black text-black uppercase italic mb-12 tracking-tighter leading-none">ABOUT THIS SCROLL</h3>
                      <p className="text-black font-bold italic leading-relaxed text-3xl">
                        "{selectedCourse.description} LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT. SED DO EIUSMOD TEMPOR INCIDIDUNT UT LABORE ET DOLORE MAGNA ALIQUA. UT ENIM AD MINIM VENIAM, QUIS NOSTRUD EXERCITATION ULLAMCO LABORIS NISI UT ALIQUIP EX EA COMMODO CONSEQUAT."
                      </p>
                    </div>

                    <div>
                      <h3 className="text-5xl font-black text-black uppercase italic mb-12 tracking-tighter leading-none">THE MISSION</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {[
                          'MASTER THE CORE PRINCIPLES OF THE SUBJECT',
                          'APPLY PRACTICAL FRAMEWORKS TO YOUR BUSINESS',
                          'BUILD A SUSTAINABLE WORKFLOW FOR GROWTH',
                          'CONNECT WITH A COMMUNITY OF LIKE-MINDED FOUNDERS'
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-6 bg-white border-8 border-black p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                            <div className="mt-1 w-10 h-10 bg-[#00FF00] border-4 border-black flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-black stroke-[3px]" />
                            </div>
                            <span className="text-black font-black text-lg italic uppercase leading-tight">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <div className="bg-[#00FFFF] border-[10px] border-black p-12 space-y-12 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-center justify-between text-lg font-black uppercase italic text-black tracking-widest">
                        <div className="flex items-center gap-4">
                          <Clock className="w-8 h-8 stroke-[3px]" /> DURATION
                        </div>
                        <span className="text-2xl">{selectedCourse.duration}</span>
                      </div>
                      <div className="flex items-center justify-between text-lg font-black uppercase italic text-black tracking-widest">
                        <div className="flex items-center gap-4">
                          <Users className="w-8 h-8 stroke-[3px]" /> TROLLS
                        </div>
                        <span className="text-2xl">{selectedCourse.students.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-lg font-black uppercase italic text-black tracking-widest">
                        <div className="flex items-center gap-4">
                          <Star className="w-8 h-8 text-[#FF00FF] fill-[#FF00FF] stroke-[3px]" /> VIBE
                        </div>
                        <span className="text-2xl">{selectedCourse.rating} / 5.0</span>
                      </div>
                      <div className="pt-8">
                        <button className="w-full bg-black text-white border-8 border-black px-10 py-6 font-black text-3xl uppercase italic shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                          ENROLL NOW
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border-[10px] border-black p-10 flex items-center gap-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                      <div className="w-24 h-24 bg-[#FF00FF] border-8 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-black text-4xl text-white italic">
                        {selectedCourse.instructor[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase italic tracking-widest text-black/40">CHIEF TROLL</p>
                        <p className="text-3xl font-black uppercase italic tracking-tighter text-black leading-none">{selectedCourse.instructor}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
