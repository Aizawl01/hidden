
import type { Theme } from './types';
import {
  TimeTravelerIcon,
  StyleLookbookIcon,
  MallShootIcon,
  MiniatureMeIcon,
  HairStylerIcon,
  ImpossiblePicsIcon,
  ProHeadshotsIcon,
} from './components/Icons';

export const THEMES: Theme[] = [
  {
    id: 'time-traveler',
    name: 'Time Traveler',
    description: 'See yourself through the decades.',
    prompt: 'Place the person in the image into a scene from the 1920s. Make it look like an authentic vintage photograph from that era.',
    icon: TimeTravelerIcon,
  },
  {
    id: 'style-lookbook',
    name: 'Style Lookbook',
    description: 'Your personal fashion photoshoot.',
    prompt: 'Redraw the person in the image in a high-fashion, avant-garde outfit. The background should be a minimalist studio setting.',
    icon: StyleLookbookIcon,
  },
  {
    id: '80s-mall-shoot',
    name: "'80s Mall Shoot",
    description: 'Totally tubular 1980s portraits.',
    prompt: 'Transform this into a 1980s style mall glamour shot. Include big hair, neon colors, and a laser grid background.',
    icon: MallShootIcon,
  },
  {
    id: 'miniature-me',
    name: 'Miniature Me',
    description: 'Your own collectible figurines.',
    prompt: 'Turn the person into a detailed, collectible miniature figurine. They should be standing on a small, circular display base. Use a tilt-shift effect to make the scene look miniature.',
    icon: MiniatureMeIcon,
  },
  {
    id: 'hair-styler',
    name: 'Hair Styler',
    description: 'Try on new hairstyles and colors.',
    prompt: 'Change the person\'s hairstyle to a vibrant, colorful, punk-rock mohawk. Keep their facial features the same.',
    icon: HairStylerIcon,
  },
  {
    id: 'impossible-pics',
    name: 'Impossible Pics',
    description: 'Photos that defy reality.',
    prompt: 'Place the person in a surreal, dreamlike landscape. Think floating islands, giant flowers, and two moons in the sky.',
    icon: ImpossiblePicsIcon,
  },
  {
    id: 'pro-headshots',
    name: 'Pro Headshots',
    description: 'Professional profile pictures.',
    prompt: 'Turn this photo into a professional corporate headshot. The person should be wearing a business suit, with a clean, blurred office background. The lighting should be soft and professional.',
    icon: ProHeadshotsIcon,
  },
];
