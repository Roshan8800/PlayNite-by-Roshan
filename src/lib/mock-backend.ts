
// Mock backend service with comprehensive search functionality
// This simulates a real backend API with realistic data and search capabilities

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  verified: boolean;
  bio?: string;
  followers: number;
  following: number;
  posts: number;
  joinedDate: string;
  location?: string;
  website?: string;
}

export interface ImageData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: 'photos' | 'art' | 'ai-generated' | 'screenshots' | 'memes' | 'wallpapers';
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  downloads: number;
  uploadDate: string;
  user: User;
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
  aiGenerated?: boolean;
  camera?: string;
  location?: string;
}

export interface VideoData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  category: 'entertainment' | 'education' | 'music' | 'comedy' | 'travel' | 'tech' | 'cooking' | 'art';
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  uploadDate: string;
  user: User;
  isLiked?: boolean;
  isSaved?: boolean;
  quality: 'HD' | '4K' | '8K';
  fps: number;
}

export interface StoryData {
  id: string;
  user: User;
  stories: Array<{
    id: string;
    imageUrl: string;
    caption: string;
    timestamp: string;
    views: number;
    likes?: number;
    type: 'image' | 'video';
    videoUrl?: string;
  }>;
  category: 'recent' | 'popular' | 'following';
  isViewed: boolean;
  totalViews: number;
}

export interface SearchResult {
  id: string;
  type: 'image' | 'video' | 'story' | 'user';
  title: string;
  description: string;
  thumbnailUrl: string;
  url: string;
  user: User;
  metadata: {
    views?: number;
    likes?: number;
    comments?: number;
    uploadDate: string;
    category?: string;
    tags?: string[];
  };
  relevance: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'tag' | 'user' | 'category';
  count?: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}

export interface PopularSearch {
  id: string;
  query: string;
  count: number;
  trending: boolean;
}

// Comprehensive mock data
const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Sarah Johnson",
    username: "sarahj_photo",
    email: "sarah@example.com",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
    verified: true,
    bio: "Professional photographer specializing in landscapes and portraits",
    followers: 15420,
    following: 892,
    posts: 342,
    joinedDate: "2022-03-15T10:30:00Z",
    location: "San Francisco, CA",
    website: "https://sarahjphotography.com"
  },
  {
    id: "user-2",
    name: "Mike Chen",
    username: "mikechen_ai",
    email: "mike@example.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "AI artist and digital creator exploring the future of art",
    followers: 8930,
    following: 456,
    posts: 128,
    joinedDate: "2022-08-22T14:15:00Z",
    location: "Austin, TX"
  },
  {
    id: "user-3",
    name: "Emma Wilson",
    username: "emmaw_design",
    email: "emma@example.com",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
    verified: true,
    bio: "UX/UI Designer & Digital Artist | Creating beautiful experiences",
    followers: 25670,
    following: 1234,
    posts: 567,
    joinedDate: "2021-11-08T09:45:00Z",
    location: "New York, NY",
    website: "https://emmawdesign.com"
  },
  {
    id: "user-4",
    name: "Alex Rodriguez",
    username: "alexr_travels",
    email: "alex@example.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "Travel photographer | Exploring the world one shot at a time",
    followers: 12340,
    following: 678,
    posts: 234,
    joinedDate: "2022-01-12T16:20:00Z",
    location: "Miami, FL"
  },
  {
    id: "user-5",
    name: "Lisa Park",
    username: "lisapark_art",
    email: "lisa@example.com",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face",
    verified: true,
    bio: "Contemporary artist | Mixed media & digital art enthusiast",
    followers: 18750,
    following: 892,
    posts: 445,
    joinedDate: "2021-06-30T11:10:00Z",
    location: "Portland, OR"
  },
  {
    id: "user-6",
    name: "David Kim",
    username: "davidkim_tech",
    email: "david@example.com",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "Tech reviewer & content creator | Gadgets, apps, and innovation",
    followers: 34200,
    following: 1456,
    posts: 789,
    joinedDate: "2020-12-05T13:25:00Z",
    location: "Seattle, WA",
    website: "https://davidkimtech.com"
  },
  {
    id: "user-7",
    name: "Zoe Martinez",
    username: "zoe_fitlife",
    email: "zoe@example.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "Fitness enthusiast | Personal trainer | Healthy lifestyle advocate",
    followers: 8950,
    following: 234,
    posts: 156,
    joinedDate: "2023-02-18T08:15:00Z",
    location: "Los Angeles, CA"
  },
  {
    id: "user-8",
    name: "James Wilson",
    username: "james_cooks",
    email: "james@example.com",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=40&h=40&fit=crop&crop=face",
    verified: true,
    bio: "Chef & Food blogger | Creating delicious memories one recipe at a time",
    followers: 45200,
    following: 567,
    posts: 423,
    joinedDate: "2021-09-12T12:00:00Z",
    location: "Chicago, IL",
    website: "https://jamescooks.com"
  },
  {
    id: "user-9",
    name: "Nina Chen",
    username: "ninadraws",
    email: "nina@example.com",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "Illustrator & Animator | Bringing stories to life with colors and motion",
    followers: 12300,
    following: 445,
    posts: 289,
    joinedDate: "2022-05-20T14:30:00Z",
    location: "San Diego, CA"
  },
  {
    id: "user-10",
    name: "Marcus Thompson",
    username: "marcust_media",
    email: "marcus@example.com",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "Social media strategist | Helping brands tell their stories",
    followers: 23400,
    following: 1234,
    posts: 567,
    joinedDate: "2022-11-03T16:45:00Z",
    location: "Atlanta, GA"
  },
  {
    id: "user-11",
    name: "Aria Patel",
    username: "aria_writes",
    email: "aria@example.com",
    avatar: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=40&h=40&fit=crop&crop=face",
    verified: true,
    bio: "Author & Storyteller | Weaving words into worlds | NYT Bestselling author",
    followers: 67800,
    following: 234,
    posts: 145,
    joinedDate: "2020-08-15T10:20:00Z",
    location: "Boston, MA",
    website: "https://ariapatelbooks.com"
  },
  {
    id: "user-12",
    name: "Ryan Foster",
    username: "ryan_outdoors",
    email: "ryan@example.com",
    avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "Adventure seeker | Hiking, camping, and exploring nature's wonders",
    followers: 15600,
    following: 345,
    posts: 234,
    joinedDate: "2022-07-10T09:15:00Z",
    location: "Denver, CO"
  },
  {
    id: "user-13",
    name: "Sophie Green",
    username: "sophie_style",
    email: "sophie@example.com",
    avatar: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "Fashion blogger | Style inspiration for the modern woman",
    followers: 34500,
    following: 678,
    posts: 456,
    joinedDate: "2021-12-22T11:30:00Z",
    location: "Nashville, TN"
  },
  {
    id: "user-14",
    name: "Carlos Mendez",
    username: "carlos_music",
    email: "carlos@example.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
    verified: true,
    bio: "Musician & Producer | Creating beats that move your soul",
    followers: 78900,
    following: 456,
    posts: 234,
    joinedDate: "2020-03-28T18:45:00Z",
    location: "Las Vegas, NV",
    website: "https://carlosmusic.com"
  },
  {
    id: "user-15",
    name: "Luna Kim",
    username: "luna_garden",
    email: "luna@example.com",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=40&h=40&fit=crop&crop=face",
    verified: false,
    bio: "Urban gardener | Growing food and flowers in the city",
    followers: 8900,
    following: 234,
    posts: 178,
    joinedDate: "2023-01-05T13:20:00Z",
    location: "Philadelphia, PA"
  }
];

const mockImages: ImageData[] = [
  {
    id: "img-1",
    title: "Mountain Landscape at Sunrise",
    description: "A breathtaking view of snow-capped mountains at sunrise, captured during my hiking trip in the Swiss Alps. The golden light creates a magical atmosphere.",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["nature", "mountains", "sunrise", "landscape", "travel", "hiking", "switzerland"],
    views: 1247,
    likes: 89,
    comments: 12,
    shares: 5,
    downloads: 23,
    uploadDate: "2024-01-15T08:30:00Z",
    user: mockUsers[0],
    dimensions: { width: 1920, height: 1080 },
    fileSize: "2.4 MB",
    camera: "Canon EOS R5",
    location: "Swiss Alps, Switzerland"
  },
  {
    id: "img-2",
    title: "Futuristic Cyberpunk Portrait",
    description: "AI-generated portrait of a futuristic cyberpunk character with neon lighting effects and digital enhancements.",
    imageUrl: "https://images.unsplash.com/photo-1672236959779-1a1dcf0b0ab6?w=800&h=800&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1672236959779-1a1dcf0b0ab6?w=400&h=400&fit=crop",
    category: "ai-generated",
    tags: ["ai-art", "cyberpunk", "portrait", "digital", "neon", "futuristic", "sci-fi"],
    views: 2156,
    likes: 156,
    comments: 28,
    shares: 12,
    downloads: 45,
    uploadDate: "2024-01-14T14:20:00Z",
    user: mockUsers[1],
    dimensions: { width: 1024, height: 1024 },
    fileSize: "1.8 MB",
    aiGenerated: true
  },
  {
    id: "img-3",
    title: "Urban Night Photography",
    description: "City lights creating beautiful light trails from traffic in this long exposure shot of downtown.",
    imageUrl: "https://images.unsplash.com/photo-1605702012553-e954fbde66eb?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1605702012553-e954fbde66eb?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["city", "night", "lights", "urban", "long-exposure", "traffic", "downtown"],
    views: 3421,
    likes: 234,
    comments: 45,
    shares: 18,
    downloads: 67,
    uploadDate: "2024-01-13T19:45:00Z",
    user: mockUsers[2],
    dimensions: { width: 2048, height: 1365 },
    fileSize: "3.2 MB",
    camera: "Sony A7III",
    location: "Downtown Chicago, IL"
  },
  {
    id: "img-4",
    title: "Abstract Mixed Media Art",
    description: "Contemporary abstract artwork created with acrylic paints, ink, and digital elements for a unique texture.",
    imageUrl: "https://images.unsplash.com/photo-1736564176042-b3d49989b230?w=800&h=800&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1736564176042-b3d49989b230?w=400&h=400&fit=crop",
    category: "art",
    tags: ["abstract", "contemporary", "acrylic", "mixed-media", "colorful", "modern", "texture"],
    views: 987,
    likes: 67,
    comments: 8,
    shares: 3,
    downloads: 12,
    uploadDate: "2024-01-12T16:10:00Z",
    user: mockUsers[4],
    dimensions: { width: 1200, height: 1200 },
    fileSize: "2.1 MB"
  },
  {
    id: "img-5",
    title: "Cute Cat Monday Blues",
    description: "Funny cat meme that perfectly captures the essence of 'Monday mornings' with a grumpy cat expression.",
    imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop",
    category: "memes",
    tags: ["cat", "meme", "funny", "monday", "grumpy", "animals", "humor"],
    views: 4567,
    likes: 445,
    comments: 89,
    shares: 156,
    downloads: 234,
    uploadDate: "2024-01-11T12:00:00Z",
    user: mockUsers[3],
    dimensions: { width: 800, height: 600 },
    fileSize: "890 KB"
  },
  {
    id: "img-6",
    title: "Minimalist Gradient Wallpaper",
    description: "Calming blue gradient wallpaper perfect for desktop backgrounds with subtle texture and depth.",
    imageUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop",
    category: "wallpapers",
    tags: ["wallpaper", "minimalist", "gradient", "blue", "desktop", "calming", "background"],
    views: 2341,
    likes: 123,
    comments: 15,
    shares: 8,
    downloads: 567,
    uploadDate: "2024-01-10T18:25:00Z",
    user: mockUsers[2],
    dimensions: { width: 2560, height: 1440 },
    fileSize: "1.5 MB"
  },
  {
    id: "img-7",
    title: "Ocean Waves at Sunset",
    description: "Peaceful seascape with golden hour lighting and gentle waves rolling onto pristine beach sand.",
    imageUrl: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["ocean", "waves", "sunset", "beach", "peaceful", "golden-hour", "seascape"],
    views: 3456,
    likes: 287,
    comments: 34,
    shares: 23,
    downloads: 89,
    uploadDate: "2024-01-09T17:45:00Z",
    user: mockUsers[0],
    dimensions: { width: 2048, height: 1365 },
    fileSize: "3.8 MB",
    camera: "Canon EOS R5",
    location: "Malibu Beach, CA"
  },
  {
    id: "img-8",
    title: "Digital Fantasy Landscape",
    description: "Surreal digital artwork featuring floating islands, mystical creatures, and ethereal lighting effects.",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=800&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop",
    category: "ai-generated",
    tags: ["fantasy", "digital-art", "surreal", "floating-islands", "mystical", "ethereal", "landscape"],
    views: 1876,
    likes: 134,
    comments: 22,
    shares: 11,
    downloads: 34,
    uploadDate: "2024-01-08T13:15:00Z",
    user: mockUsers[1],
    dimensions: { width: 1024, height: 1024 },
    fileSize: "2.3 MB",
    aiGenerated: true
  },
  {
    id: "img-9",
    title: "Homemade Pasta Making",
    description: "Fresh pasta being made by hand with flour flying everywhere! The authentic Italian way to start dinner.",
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["cooking", "pasta", "food", "homemade", "italian", "kitchen", "flour"],
    views: 3421,
    likes: 234,
    comments: 45,
    shares: 18,
    downloads: 67,
    uploadDate: "2024-01-07T16:30:00Z",
    user: mockUsers[7],
    dimensions: { width: 2048, height: 1365 },
    fileSize: "3.1 MB",
    camera: "Canon EOS R6",
    location: "Little Italy, NYC"
  },
  {
    id: "img-10",
    title: "Character Illustration Study",
    description: "Digital character design study featuring expressive poses and vibrant colors. Part of my ongoing illustration project.",
    imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=800&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop",
    category: "art",
    tags: ["illustration", "character-design", "digital-art", "concept-art", "animation", "colorful"],
    views: 1876,
    likes: 134,
    comments: 22,
    shares: 11,
    downloads: 34,
    uploadDate: "2024-01-06T14:20:00Z",
    user: mockUsers[8],
    dimensions: { width: 1200, height: 1200 },
    fileSize: "2.2 MB"
  },
  {
    id: "img-11",
    title: "Vintage Camera Collection",
    description: "My prized collection of vintage film cameras from the 70s and 80s. Each one has its own story to tell.",
    imageUrl: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["vintage", "camera", "collection", "film", "photography", "retro", "hobby"],
    views: 2156,
    likes: 156,
    comments: 28,
    shares: 12,
    downloads: 45,
    uploadDate: "2024-01-05T11:45:00Z",
    user: mockUsers[0],
    dimensions: { width: 2048, height: 1365 },
    fileSize: "2.8 MB",
    camera: "iPhone 14 Pro"
  },
  {
    id: "img-12",
    title: "Success Kid Meme Original",
    description: "The original Success Kid meme that started it all! Fist pump for achieving those goals 💪",
    imageUrl: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=400&h=300&fit=crop",
    category: "memes",
    tags: ["success-kid", "meme", "motivation", "goals", "achievement", "classic", "internet"],
    views: 8765,
    likes: 1234,
    comments: 234,
    shares: 567,
    downloads: 890,
    uploadDate: "2024-01-04T09:15:00Z",
    user: mockUsers[3],
    dimensions: { width: 800, height: 600 },
    fileSize: "756 KB"
  },
  {
    id: "img-13",
    title: "Forest Path in Autumn",
    description: "A serene forest path covered in golden autumn leaves. Perfect for a peaceful weekend walk.",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["forest", "autumn", "path", "leaves", "nature", "peaceful", "hiking"],
    views: 4321,
    likes: 345,
    comments: 56,
    shares: 23,
    downloads: 89,
    uploadDate: "2024-01-03T15:30:00Z",
    user: mockUsers[11],
    dimensions: { width: 2048, height: 1365 },
    fileSize: "3.4 MB",
    camera: "Fujifilm X-T4",
    location: "Rocky Mountain National Park"
  },
  {
    id: "img-14",
    title: "Street Fashion Portrait",
    description: "Urban fashion photography featuring bold patterns and confident poses in the city streets.",
    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=800&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=400&fit=crop",
    category: "photos",
    tags: ["fashion", "street-style", "portrait", "urban", "model", "photography"],
    views: 5678,
    likes: 456,
    comments: 67,
    shares: 34,
    downloads: 123,
    uploadDate: "2024-01-02T13:20:00Z",
    user: mockUsers[12],
    dimensions: { width: 1500, height: 1500 },
    fileSize: "2.6 MB",
    camera: "Sony A7R IV",
    location: "SoHo, NYC"
  },
  {
    id: "img-15",
    title: "Dramatic Storm Clouds",
    description: "Incredible storm cloud formation over the prairie. Nature's raw power on full display.",
    imageUrl: "https://images.unsplash.com/photo-1533450718592-29d45635f0a9?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1533450718592-29d45635f0a9?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["storm", "clouds", "weather", "dramatic", "sky", "nature", "prairie"],
    views: 6789,
    likes: 567,
    comments: 78,
    shares: 45,
    downloads: 156,
    uploadDate: "2024-01-01T17:45:00Z",
    user: mockUsers[0],
    dimensions: { width: 2048, height: 1365 },
    fileSize: "4.1 MB",
    camera: "Canon EOS R5",
    location: "Kansas Prairie"
  },
  {
    id: "img-16",
    title: "Cozy Coffee Shop Interior",
    description: "Warm and inviting coffee shop interior with vintage furniture and soft lighting. The perfect spot to work or relax.",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["coffee-shop", "interior", "cozy", "vintage", "cafe", "atmosphere"],
    views: 3456,
    likes: 287,
    comments: 34,
    shares: 23,
    downloads: 89,
    uploadDate: "2023-12-31T10:30:00Z",
    user: mockUsers[2],
    dimensions: { width: 2048, height: 1365 },
    fileSize: "3.2 MB",
    camera: "Sony A7III",
    location: "Portland, OR"
  }
];

const mockVideos: VideoData[] = [
  {
    id: "vid-1",
    title: "Amazing Dance Performance",
    description: "Incredible dance moves that will blow your mind! 💃✨ Watch this talented group perform an amazing choreography.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&h=600&fit=crop",
    duration: "3:45",
    category: "entertainment",
    tags: ["dance", "performance", "choreography", "talent", "music", "entertainment"],
    views: 12500,
    likes: 342,
    comments: 67,
    shares: 89,
    uploadDate: "2024-01-15T10:30:00Z",
    user: mockUsers[0],
    quality: "HD",
    fps: 30
  },
  {
    id: "vid-2",
    title: "AI Art Creation Process",
    description: "Step-by-step guide on how I create my AI-generated artwork using the latest tools and techniques.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1672236959779-1a1dcf0b0ab6?w=400&h=600&fit=crop",
    duration: "12:23",
    category: "education",
    tags: ["ai-art", "tutorial", "digital-art", "creative-process", "ai-tools", "education"],
    views: 8900,
    likes: 456,
    comments: 123,
    shares: 234,
    uploadDate: "2024-01-14T16:20:00Z",
    user: mockUsers[1],
    quality: "4K",
    fps: 60
  },
  {
    id: "vid-3",
    title: "City Lights Timelapse",
    description: "Beautiful 4K timelapse of city lights during rush hour. Watch the traffic create rivers of light through the urban landscape.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1605702012553-e954fbde66eb?w=400&h=600&fit=crop",
    duration: "2:15",
    category: "travel",
    tags: ["timelapse", "city", "lights", "urban", "traffic", "night-photography", "travel"],
    views: 15600,
    likes: 678,
    comments: 145,
    shares: 123,
    uploadDate: "2024-01-13T19:45:00Z",
    user: mockUsers[2],
    quality: "4K",
    fps: 30
  },
  {
    id: "vid-4",
    title: "Cooking Masterclass: Pasta",
    description: "Learn to make authentic Italian pasta from scratch with this comprehensive cooking tutorial.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=600&fit=crop",
    duration: "18:42",
    category: "cooking",
    tags: ["cooking", "pasta", "italian", "tutorial", "masterclass", "food", "recipe"],
    views: 23400,
    likes: 891,
    comments: 234,
    shares: 345,
    uploadDate: "2024-01-12T14:10:00Z",
    user: mockUsers[3],
    quality: "HD",
    fps: 30
  },
  {
    id: "vid-5",
    title: "Latest Smartphone Review",
    description: "Comprehensive review of the newest flagship smartphone including camera test, performance benchmarks, and features overview.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=600&fit=crop",
    duration: "15:18",
    category: "tech",
    tags: ["smartphone", "review", "technology", "camera", "performance", "gadgets", "unboxing"],
    views: 18700,
    likes: 567,
    comments: 189,
    shares: 267,
    uploadDate: "2024-01-11T11:30:00Z",
    user: mockUsers[5],
    quality: "4K",
    fps: 60
  },
  {
    id: "vid-6",
    title: "Digital Art Speed Painting",
    description: "Watch me create this stunning digital painting from start to finish in under 30 minutes.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=600&fit=crop",
    duration: "28:33",
    category: "art",
    tags: ["digital-art", "speed-painting", "tutorial", "procreate", "art-process", "creative"],
    views: 9200,
    likes: 345,
    comments: 67,
    shares: 145,
    uploadDate: "2024-01-10T15:45:00Z",
    user: mockUsers[4],
    quality: "HD",
    fps: 30
  },
  {
    id: "vid-7",
    title: "Morning Yoga Flow",
    description: "Start your day with this energizing 20-minute yoga flow perfect for all levels. Focus on strength and flexibility.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
    duration: "20:15",
    category: "education",
    tags: ["yoga", "fitness", "morning-routine", "health", "wellness", "exercise", "mindfulness"],
    views: 34500,
    likes: 1234,
    comments: 234,
    shares: 456,
    uploadDate: "2024-01-09T07:00:00Z",
    user: mockUsers[6],
    quality: "HD",
    fps: 30
  },
  {
    id: "vid-8",
    title: "Homemade Pizza Tutorial",
    description: "Make restaurant-quality pizza at home with this foolproof recipe. From dough to delicious toppings!",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=600&fit=crop",
    duration: "25:30",
    category: "cooking",
    tags: ["pizza", "cooking", "recipe", "homemade", "italian-food", "baking", "tutorial"],
    views: 45600,
    likes: 2341,
    comments: 345,
    shares: 567,
    uploadDate: "2024-01-08T18:30:00Z",
    user: mockUsers[7],
    quality: "4K",
    fps: 30
  },
  {
    id: "vid-9",
    title: "Urban Photography Tips",
    description: "Master street photography with these essential tips and techniques. Shot on location in downtown Chicago.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1605702012553-e954fbde66eb?w=400&h=600&fit=crop",
    duration: "14:22",
    category: "education",
    tags: ["photography", "street-photography", "tutorial", "urban", "tips", "camera", "composition"],
    views: 23400,
    likes: 891,
    comments: 156,
    shares: 234,
    uploadDate: "2024-01-07T12:15:00Z",
    user: mockUsers[2],
    quality: "HD",
    fps: 30
  },
  {
    id: "vid-10",
    title: "Indie Music Production",
    description: "Behind the scenes of creating an indie track from scratch using just a laptop and some inspiration.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop",
    duration: "22:45",
    category: "music",
    tags: ["music-production", "indie", "tutorial", "recording", "mixing", "creative-process"],
    views: 15600,
    likes: 678,
    comments: 123,
    shares: 189,
    uploadDate: "2024-01-06T16:45:00Z",
    user: mockUsers[13],
    quality: "HD",
    fps: 30
  },
  {
    id: "vid-11",
    title: "Minimalist Living Room Makeover",
    description: "Transform your living space with minimalist design principles. Budget-friendly tips and inspiration.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=600&fit=crop",
    duration: "16:33",
    category: "art",
    tags: ["interior-design", "minimalist", "home-makeover", "diy", "budget-friendly", "inspiration"],
    views: 28900,
    likes: 1456,
    comments: 267,
    shares: 345,
    uploadDate: "2024-01-05T14:20:00Z",
    user: mockUsers[2],
    quality: "4K",
    fps: 30
  },
  {
    id: "vid-12",
    title: "Wildlife Photography Adventure",
    description: "Join me on a wildlife photography expedition in Yellowstone. Tips for capturing animals in their natural habitat.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=400&h=600&fit=crop",
    duration: "35:18",
    category: "travel",
    tags: ["wildlife", "photography", "yellowstone", "adventure", "nature", "animals", "travel"],
    views: 34500,
    likes: 1890,
    comments: 234,
    shares: 456,
    uploadDate: "2024-01-04T09:30:00Z",
    user: mockUsers[3],
    quality: "4K",
    fps: 60
  }
];

const mockStories: StoryData[] = [
  {
    id: "story-1",
    user: mockUsers[0],
    stories: [
      {
        id: "story-1-1",
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
        caption: "Beautiful morning vibes ☀️",
        timestamp: "2024-01-15T08:30:00Z",
        views: 1247,
        type: "image"
      },
      {
        id: "story-1-2",
        imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop",
        caption: "Coffee time with friends ☕",
        timestamp: "2024-01-15T09:15:00Z",
        views: 892,
        type: "image"
      }
    ],
    category: "recent",
    isViewed: false,
    totalViews: 2139
  },
  {
    id: "story-2",
    user: mockUsers[1],
    stories: [
      {
        id: "story-2-1",
        imageUrl: "https://images.unsplash.com/photo-1672236959779-1a1dcf0b0ab6?w=400&h=600&fit=crop",
        caption: "Adventure awaits! 🏔️",
        timestamp: "2024-01-15T14:20:00Z",
        views: 2156,
        type: "image"
      }
    ],
    category: "popular",
    isViewed: true,
    totalViews: 2156
  },
  {
    id: "story-3",
    user: mockUsers[2],
    stories: [
      {
        id: "story-3-1",
        imageUrl: "https://images.unsplash.com/photo-1605702012553-e954fbde66eb?w=400&h=600&fit=crop",
        caption: "City lights tonight ✨",
        timestamp: "2024-01-15T19:45:00Z",
        views: 3421,
        type: "image"
      },
      {
        id: "story-3-2",
        imageUrl: "https://images.unsplash.com/photo-1736564176042-b3d49989b230?w=400&h=600&fit=crop",
        caption: "Late night thoughts 🌙",
        timestamp: "2024-01-15T20:30:00Z",
        views: 1876,
        type: "image"
      }
    ],
    category: "following",
    isViewed: false,
    totalViews: 5297
  },
  {
    id: "story-4",
    user: mockUsers[3],
    stories: [
      {
        id: "story-4-1",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=600&fit=crop",
        caption: "Street photography 📸",
        timestamp: "2024-01-14T16:10:00Z",
        views: 987,
        type: "image"
      }
    ],
    category: "recent",
    isViewed: false,
    totalViews: 987
  },
  {
    id: "story-5",
    user: mockUsers[4],
    stories: [
      {
        id: "story-5-1",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
        caption: "Nature's beauty 🌸",
        timestamp: "2024-01-14T12:00:00Z",
        views: 4567,
        type: "image"
      }
    ],
    category: "popular",
    isViewed: false,
    totalViews: 4567
  },
  {
    id: "story-6",
    user: mockUsers[5],
    stories: [
      {
        id: "story-6-1",
        imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=600&fit=crop",
        caption: "Urban exploration 🏙️",
        timestamp: "2024-01-13T18:25:00Z",
        views: 2341,
        type: "image"
      }
    ],
    category: "following",
    isViewed: true,
    totalViews: 2341
  },
  {
    id: "story-7",
    user: mockUsers[6],
    stories: [
      {
        id: "story-7-1",
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=600&fit=crop",
        caption: "Morning workout complete! 💪",
        timestamp: "2024-01-15T06:30:00Z",
        views: 3456,
        type: "image"
      },
      {
        id: "story-7-2",
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop",
        caption: "Healthy breakfast bowl 🥣",
        timestamp: "2024-01-15T07:15:00Z",
        views: 2341,
        type: "image"
      }
    ],
    category: "recent",
    isViewed: false,
    totalViews: 5797
  },
  {
    id: "story-8",
    user: mockUsers[7],
    stories: [
      {
        id: "story-8-1",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=600&fit=crop",
        caption: "Fresh pasta in the making 🍝",
        timestamp: "2024-01-14T19:20:00Z",
        views: 4567,
        type: "image"
      },
      {
        id: "story-8-2",
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=600&fit=crop",
        caption: "Dinner is served! Buon appetito 🍽️",
        timestamp: "2024-01-14T20:45:00Z",
        views: 3456,
        type: "image"
      }
    ],
    category: "popular",
    isViewed: false,
    totalViews: 8023
  },
  {
    id: "story-9",
    user: mockUsers[8],
    stories: [
      {
        id: "story-9-1",
        imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=600&fit=crop",
        caption: "Character design process 🎨",
        timestamp: "2024-01-14T14:10:00Z",
        views: 1876,
        type: "image"
      },
      {
        id: "story-9-2",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop",
        caption: "Final animation test ✨",
        timestamp: "2024-01-14T15:30:00Z",
        views: 1543,
        type: "image"
      }
    ],
    category: "following",
    isViewed: true,
    totalViews: 3419
  },
  {
    id: "story-10",
    user: mockUsers[9],
    stories: [
      {
        id: "story-10-1",
        imageUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=600&fit=crop",
        caption: "Brand strategy session 📊",
        timestamp: "2024-01-13T11:00:00Z",
        views: 1234,
        type: "image"
      }
    ],
    category: "recent",
    isViewed: false,
    totalViews: 1234
  },
  {
    id: "story-11",
    user: mockUsers[10],
    stories: [
      {
        id: "story-11-1",
        imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop",
        caption: "Book signing event tonight! 📚",
        timestamp: "2024-01-12T18:30:00Z",
        views: 5678,
        type: "image"
      }
    ],
    category: "popular",
    isViewed: false,
    totalViews: 5678
  },
  {
    id: "story-12",
    user: mockUsers[11],
    stories: [
      {
        id: "story-12-1",
        imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=600&fit=crop",
        caption: "Mountain hiking adventure ⛰️",
        timestamp: "2024-01-11T09:45:00Z",
        views: 4321,
        type: "image"
      },
      {
        id: "story-12-2",
        imageUrl: "https://images.unsplash.com/photo-1464822759844-d150baec93d5?w=400&h=600&fit=crop",
        caption: "Camping under the stars 🏕️",
        timestamp: "2024-01-11T20:15:00Z",
        views: 3456,
        type: "image"
      }
    ],
    category: "following",
    isViewed: false,
    totalViews: 7777
  },
  {
    id: "story-13",
    user: mockUsers[12],
    stories: [
      {
        id: "story-13-1",
        imageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=600&fit=crop",
        caption: "Fashion week behind the scenes 👗",
        timestamp: "2024-01-10T16:20:00Z",
        views: 6789,
        type: "image"
      }
    ],
    category: "recent",
    isViewed: true,
    totalViews: 6789
  },
  {
    id: "story-14",
    user: mockUsers[13],
    stories: [
      {
        id: "story-14-1",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop",
        caption: "Late night studio session 🎵",
        timestamp: "2024-01-09T23:30:00Z",
        views: 2341,
        type: "image"
      }
    ],
    category: "popular",
    isViewed: false,
    totalViews: 2341
  },
  {
    id: "story-15",
    user: mockUsers[14],
    stories: [
      {
        id: "story-15-1",
        imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=600&fit=crop",
        caption: "Urban garden progress 🌱",
        timestamp: "2024-01-08T08:00:00Z",
        views: 1234,
        type: "image"
      },
      {
        id: "story-15-2",
        imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=600&fit=crop",
        caption: "Fresh harvest from the balcony! 🥬",
        timestamp: "2024-01-08T17:20:00Z",
        views: 987,
        type: "image"
      }
    ],
    category: "following",
    isViewed: false,
    totalViews: 2221
  }
];

// Search suggestions and popular searches
const mockSearchSuggestions: SearchSuggestion[] = [
  { id: "sugg-1", text: "mountain landscape", type: "query", count: 1247 },
  { id: "sugg-2", text: "ai art", type: "tag", count: 2156 },
  { id: "sugg-3", text: "city night", type: "query", count: 3421 },
  { id: "sugg-4", text: "abstract art", type: "tag", count: 987 },
  { id: "sugg-5", text: "cat meme", type: "query", count: 4567 },
  { id: "sugg-6", text: "wallpaper", type: "category", count: 2341 },
  { id: "sugg-7", text: "dance performance", type: "query", count: 12500 },
  { id: "sugg-8", text: "cooking tutorial", type: "query", count: 23400 },
  { id: "sugg-9", text: "sarahj_photo", type: "user", count: 15420 },
  { id: "sugg-10", text: "mikechen_ai", type: "user", count: 8930 }
];

const mockPopularSearches: PopularSearch[] = [
  { id: "pop-1", query: "mountain landscape", count: 15420, trending: true },
  { id: "pop-2", query: "ai generated art", count: 12890, trending: true },
  { id: "pop-3", query: "city lights", count: 9870, trending: false },
  { id: "pop-4", query: "cat memes", count: 8760, trending: false },
  { id: "pop-5", query: "digital art", count: 7650, trending: true },
  { id: "pop-6", query: "cooking tutorial", count: 6540, trending: false },
  { id: "pop-7", query: "travel photography", count: 5430, trending: false },
  { id: "pop-8", query: "abstract painting", count: 4320, trending: false }
];

// Search service class
export class MockSearchService {
  private searchHistory: SearchHistory[] = [];
  private userSearchHistory: Map<string, SearchHistory[]> = new Map();

  // Global search across all content types
  async search(query: string, filters?: {
    type?: 'all' | 'image' | 'video' | 'story' | 'user';
    category?: string;
    sortBy?: 'relevance' | 'date' | 'popularity';
    limit?: number;
  }): Promise<{ results: SearchResult[]; total: number; suggestions: SearchSuggestion[] }> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return { results: [], total: 0, suggestions: mockSearchSuggestions.slice(0, 5) };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const results: SearchResult[] = [];
    const type = filters?.type || 'all';
    const limit = filters?.limit || 20;

    // Search in images
    if (type === 'all' || type === 'image') {
      mockImages.forEach(image => {
        const relevance = this.calculateRelevance(normalizedQuery, image);
        if (relevance > 0) {
          results.push({
            id: image.id,
            type: 'image',
            title: image.title,
            description: image.description,
            thumbnailUrl: image.thumbnailUrl,
            url: `/images/${image.id}`,
            user: image.user,
            metadata: {
              views: image.views,
              likes: image.likes,
              comments: image.comments,
              uploadDate: image.uploadDate,
              category: image.category,
              tags: image.tags
            },
            relevance
          });
        }
      });
    }

    // Search in videos
    if (type === 'all' || type === 'video') {
      mockVideos.forEach(video => {
        const relevance = this.calculateRelevance(normalizedQuery, video);
        if (relevance > 0) {
          results.push({
            id: video.id,
            type: 'video',
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            url: `/reels/${video.id}`,
            user: video.user,
            metadata: {
              views: video.views,
              likes: video.likes,
              comments: video.comments,
              uploadDate: video.uploadDate,
              category: video.category,
              tags: video.tags
            },
            relevance
          });
        }
      });
    }

    // Search in stories
    if (type === 'all' || type === 'story') {
      mockStories.forEach(story => {
        const relevance = this.calculateStoryRelevance(normalizedQuery, story);
        if (relevance > 0) {
          results.push({
            id: story.id,
            type: 'story',
            title: `${story.user.name}'s story`,
            description: story.stories[0]?.caption || '',
            thumbnailUrl: story.user.avatar,
            url: `/stories/${story.id}`,
            user: story.user,
            metadata: {
              views: story.totalViews,
              uploadDate: story.stories[0]?.timestamp || story.stories[0]?.timestamp || '',
              category: story.category
            },
            relevance
          });
        }
      });
    }

    // Search in users
    if (type === 'all' || type === 'user') {
      mockUsers.forEach(user => {
        const relevance = this.calculateUserRelevance(normalizedQuery, user);
        if (relevance > 0) {
          results.push({
            id: user.id,
            type: 'user',
            title: user.name,
            description: user.bio || '',
            thumbnailUrl: user.avatar,
            url: `/users/${user.id}`,
            user: user,
            metadata: {
              views: user.followers,
              uploadDate: user.joinedDate
            },
            relevance
          });
        }
      });
    }

    // Sort results
    const sortBy = filters?.sortBy || 'relevance';
    results.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.metadata.uploadDate).getTime() - new Date(a.metadata.uploadDate).getTime();
        case 'popularity':
          return (b.metadata.views || 0) - (a.metadata.views || 0);
        default:
          return b.relevance - a.relevance;
      }
    });

    // Apply limit
    const limitedResults = results.slice(0, limit);

    // Add to search history
    this.addToSearchHistory(query, limitedResults.length);

    return {
      results: limitedResults,
      total: results.length,
      suggestions: this.getSuggestionsForQuery(normalizedQuery)
    };
  }

  // Real-time search suggestions
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query.trim()) return mockSearchSuggestions.slice(0, 8);

    await new Promise(resolve => setTimeout(resolve, 100));

    const normalizedQuery = query.toLowerCase();
    return mockSearchSuggestions.filter(suggestion =>
      suggestion.text.toLowerCase().includes(normalizedQuery)
    ).slice(0, 8);
  }

  // Get search history
  getSearchHistory(userId?: string): SearchHistory[] {
    if (userId) {
      return this.userSearchHistory.get(userId) || [];
    }
    return this.searchHistory;
  }

  // Get popular searches
  getPopularSearches(): PopularSearch[] {
    return mockPopularSearches;
  }

  // Clear search history
  clearSearchHistory(userId?: string): void {
    if (userId) {
      this.userSearchHistory.delete(userId);
    } else {
      this.searchHistory = [];
    }
  }

  // Calculate relevance score for images and videos
  private calculateRelevance(query: string, item: ImageData | VideoData): number {
    let score = 0;
    const title = item.title.toLowerCase();
    const description = item.description.toLowerCase();
    const tags = item.tags.join(' ').toLowerCase();

    // Exact title match gets highest score
    if (title === query) score += 100;
    // Title contains query
    else if (title.includes(query)) score += 50;
    // Title starts with query
    else if (title.startsWith(query)) score += 30;
    // Description contains query
    if (description.includes(query)) score += 20;
    // Tags contain query
    if (tags.includes(query)) score += 25;

    // Partial word matches
    const queryWords = query.split(' ');
    queryWords.forEach(word => {
      if (title.includes(word)) score += 10;
      if (description.includes(word)) score += 5;
      if (tags.includes(word)) score += 8;
    });

    return score;
  }

  // Calculate relevance score for stories
  private calculateStoryRelevance(query: string, story: StoryData): number {
    let score = 0;
    const userName = story.user.name.toLowerCase();
    const username = story.user.username.toLowerCase();
    const caption = story.stories[0]?.caption?.toLowerCase() || '';

    if (userName.includes(query) || username.includes(query)) score += 40;
    if (caption.includes(query)) score += 20;

    const queryWords = query.split(' ');
    queryWords.forEach(word => {
      if (userName.includes(word) || username.includes(word)) score += 15;
      if (caption.includes(word)) score += 10;
    });

    return score;
  }

  // Calculate relevance score for users
  private calculateUserRelevance(query: string, user: User): number {
    let score = 0;
    const name = user.name.toLowerCase();
    const username = user.username.toLowerCase();
    const bio = (user.bio || '').toLowerCase();

    if (name === query || username === query) score += 100;
    if (name.includes(query)) score += 60;
    if (username.includes(query)) score += 50;
    if (bio.includes(query)) score += 30;

    const queryWords = query.split(' ');
    queryWords.forEach(word => {
      if (name.includes(word)) score += 20;
      if (username.includes(word)) score += 15;
      if (bio.includes(word)) score += 10;
    });

    return score;
  }

  // Get suggestions based on query
  private getSuggestionsForQuery(query: string): SearchSuggestion[] {
    return mockSearchSuggestions
      .filter(s => s.text.toLowerCase().includes(query))
      .slice(0, 5);
  }

  // Add search to history
  private addToSearchHistory(query: string, resultCount: number): void {
    const historyItem: SearchHistory = {
      id: `history-${Date.now()}`,
      query,
      timestamp: new Date().toISOString(),
      resultCount
    };

    this.searchHistory.unshift(historyItem);

    // Keep only last 50 searches
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(0, 50);
    }
  }
}

// Export singleton instance
export const searchService = new MockSearchService();

// Export mock data for direct access
export { mockUsers, mockImages, mockVideos, mockStories, mockSearchSuggestions, mockPopularSearches };
