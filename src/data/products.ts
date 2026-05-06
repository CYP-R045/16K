export interface Product {
  id: number;
  name: string;
  size: string;
  price: string;
  img: string;
  model: string;
  gallery: string[];
  category: string;
  color: string;
  waist: string;
  description: string;
}

export const products: Product[] = [
  {
    id: 1, name: 'Dark Blue Jorts', size: 'W° 34', price: '$150',
    img: '/Dark_blue_Jorts.png', model: '/16kP1.png',
    gallery: ['/Dark_blue_Jorts.png', '/16kP1.png', '/16kP4.png'],
    category: 'jorts', color: 'dark-blue', waist: '34',
    description: 'Hand-cut dark blue denim shorts. Finished in-house with raw hems and custom detailing. One of a kind — built to last.',
  },
  {
    id: 2, name: 'Dark Blue Jorts', size: 'W° 32', price: '$150',
    img: '/Dark_blue_Jorts_32.png', model: '/16kP4.png',
    gallery: ['/Dark_blue_Jorts_32.png', '/16kP4.png', '/16kP1.png'],
    category: 'jorts', color: 'dark-blue', waist: '32',
    description: 'Hand-cut dark blue denim shorts. Finished in-house with raw hems and custom detailing. One of a kind — built to last.',
  },
  {
    id: 3, name: 'Light Blue Jorts', size: 'W° 36', price: '$150',
    img: '/Light_blue_jorts.png', model: '/16kP2.png',
    gallery: ['/Light_blue_jorts.png', '/16kP2.png', '/16kP5.png'],
    category: 'jorts', color: 'light-blue', waist: '36',
    description: 'Washed light blue denim shorts with a relaxed cut. Raw-hemmed and finished by hand. Every piece is unique.',
  },
  {
    id: 4, name: 'Blue Jorts', size: 'W° 32', price: '$150',
    img: '/BlueJprts.png', model: '/16kP5.png',
    gallery: ['/BlueJprts.png', '/16kP5.png', '/16kP2.png'],
    category: 'jorts', color: 'light-blue', waist: '32',
    description: 'Washed light blue denim shorts with a relaxed cut. Raw-hemmed and finished by hand. Every piece is unique.',
  },
  {
    id: 5, name: 'Black Jorts', size: 'W° 36', price: '$150',
    img: '/Black_Jorts.png', model: '/16kP3.png',
    gallery: ['/Black_Jorts.png', '/16kP3.png', '/16kP6.png'],
    category: 'jorts', color: 'black', waist: '36',
    description: 'Black denim shorts, cut clean and finished raw. A staple piece done the 16K way — no two alike.',
  },
  {
    id: 6, name: 'Black Jorts', size: 'W° 32', price: '$150',
    img: '/Black_Jorts_32.png', model: '/16kP6.png',
    gallery: ['/Black_Jorts_32.png', '/16kP6.png', '/16kP3.png'],
    category: 'jorts', color: 'black', waist: '32',
    description: 'Black denim shorts, cut clean and finished raw. A staple piece done the 16K way — no two alike.',
  },
];
