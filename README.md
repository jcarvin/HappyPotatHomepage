# Happy Potat :) Homepage

A potato-themed homepage for the fictional company "Happy Potat :)" built with React and Vite. This project serves as a testing ground for dynamic HubSpot review components and is deployed on Vercel.

## Features

- 🥔 **Potato-themed Design**: Complete with brown gradients, potato emojis, and tuber-inspired styling
- 🏢 **Company Sections**: Header, Hero, Services, HubSpot App integration, and Footer
- 🔧 **Review Component Testing Area**: Dedicated section for embedding and testing external HubSpot review components
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- ⚡ **Fast Development**: Built with Vite for lightning-fast development and hot reload
- 🚀 **Vercel Deployment**: Optimized for Vercel hosting with proper routing

## Tech Stack

- **React 19** - UI framework with latest features
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS3** - Styling with modern features (Grid, Flexbox, CSS Variables)
- **Vercel** - Hosting and deployment platform

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd happy-potat-homepage
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Vercel Deployment

This project is optimized for Vercel deployment:

### Automatic Deployment

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the Vite framework
3. Deployments happen automatically on every push to main branch

### Manual Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to configure your deployment

### Environment Variables

If you need environment variables for your HubSpot integration:

1. Add them in the Vercel dashboard under Project Settings > Environment Variables
2. Or use the Vercel CLI:
```bash
vercel env add VARIABLE_NAME
```

## Project Structure

```
src/
├── components/
│   ├── Header.tsx      # Navigation header
│   ├── Hero.tsx        # Main hero section
│   ├── Services.tsx    # Services showcase
│   ├── HubSpotApp.tsx  # HubSpot integration section
│   └── Footer.tsx      # Footer with links
├── App.tsx             # Main app component
├── App.css             # Global styles
└── main.tsx            # App entry point
```

## Review Component Testing

The `HubSpotApp.tsx` component includes a dedicated testing area for dynamic components:

```tsx
<div className="review-component-container">
  {/* Your external HubSpot review components go here */}
</div>
```

This area is specifically designed for embedding and testing external review components that integrate with HubSpot's platform. The dynamic nature of Vercel hosting allows for:

- Real-time API calls
- Dynamic content updates
- Interactive components
- Server-side rendering capabilities

## Customization

### Colors
The project uses CSS custom properties for easy theming:
- Primary brown: `#8b4513`
- Secondary brown: `#d2691e` 
- Background gradients: Wheat to beige tones

### Content
Update the component files in `src/components/` to modify:
- Company information
- Service descriptions
- Contact details
- Review component integration

## Development Workflow

1. **Local Development**: Use `npm run dev` for hot reload development
2. **Testing**: Test your review components in the dedicated testing area
3. **Build**: Run `npm run build` to create production build
4. **Deploy**: Push to main branch for automatic Vercel deployment
5. **Preview**: Use Vercel's preview deployments for testing before going live

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for testing purposes. Feel free to use and modify as needed.# HappyPotatHomepage
# HappyPotatHomepage
# HappyPotatHomepage
# HappyPotatHomepage
