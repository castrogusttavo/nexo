/** @type {import('@lhci/cli').UserConfig} */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start',
      startServerReadyPattern: 'Ready in',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/sign-in',
        'http://localhost:3000/sign-up',
        'http://localhost:3000/contact',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        interactive: ['warn', { maxNumericValue: 3800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
