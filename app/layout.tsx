import './globals.css';
import { AppShell } from '../components/AppShell';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export const metadata = {
  title: 'GATE PYQ Practice Engine',
  description: 'Premium academic practice engine for the fixed GATE PYQ dataset.',
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

const mathJaxConfigScript = `window.MathJax={tex:{inlineMath:[['$','$'],['\\\\(','\\\\)']],displayMath:[['$$','$$'],['\\\\[','\\\\]']],processEscapes:true},options:{skipHtmlTags:['script','noscript','style','textarea','pre','code']},startup:{typeset:false}};`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      // themeInitScript below reads the persisted theme from localStorage
      // and sets data-theme on this element before React hydrates, to
      // avoid a flash of the wrong theme. That intentionally makes the
      // real DOM differ from this server-rendered "dark" default whenever
      // the visitor has previously chosen light mode — suppress the
      // hydration warning for just this attribute rather than "fixing" a
      // mismatch that's working as designed (SSR has no way to know a
      // client's localStorage value without cookies).
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: mathJaxConfigScript }} />
        <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
