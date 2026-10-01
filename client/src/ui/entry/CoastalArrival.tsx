import type { ReactElement } from 'react';

/** Original vector postcard; stays sharp without a download or a 3D scene. */
export function CoastalArrival(): ReactElement {
  return <svg className="coastal-postcard" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="arrival-sunset" x2="0" y2="1"><stop stopColor="#669eaf"/><stop offset=".58" stopColor="#efceab"/><stop offset="1" stopColor="#eaa57c"/></linearGradient>
      <linearGradient id="arrival-sea" x2="0" y2="1"><stop stopColor="#80b1b0"/><stop offset="1" stopColor="#325f65"/></linearGradient>
      <pattern id="arrival-windows" width="34" height="46" patternUnits="userSpaceOnUse"><rect x="10" y="8" width="15" height="22" rx="1" fill="#315c5c"/><path d="M8 32h19" stroke="#e6c9a4" strokeWidth="4"/></pattern>
    </defs>
    <rect width="800" height="1000" fill="url(#arrival-sunset)"/>
    <circle cx="572" cy="405" r="68" fill="#fff0cd" opacity=".88"/>
    <g fill="#f6e8d4" opacity=".8"><path d="M75 253c-36-33-15-67 20-60 6-43 54-49 72-13 28-25 75-8 74 29 42-3 61 33 30 49z"/><path d="M458 181c-18-21-8-47 19-48 4-29 42-40 58-10 29-19 65 8 49 31 36-4 47 27 25 33z"/></g>
    <path d="M0 571Q130 530 263 564T530 550T800 561V720H0Z" fill="#527f79" opacity=".4"/>
    <path d="M0 609Q300 578 800 592V1000H0Z" fill="url(#arrival-sea)"/>
    <g stroke="#d7e1c9" strokeWidth="2" opacity=".45"><path d="M430 643h135m-260 39h200m60 42h146m-166 43h130m-340 42h252m26 59h118"/></g>
    <path d="M0 598L374 682 552 1000H0Z" fill="#cfaa84"/>
    <path d="M0 651L313 711 485 1000H0Z" fill="#e7cba5"/>
    <path d="M0 786L186 822 300 1000H0Z" fill="#536e5b"/>
    <g stroke="#405d57" strokeWidth="9"><path d="M363 676L543 1000"/><path d="M353 643v54m36-20v72m23-31v76m25-27v88m24-33v94m31-27v100"/></g>
    <g><path d="M-30 403L186 440V700L-30 660Z" fill="#ddbc94"/><path d="M-30 390L197 429V445L-30 408Z" fill="#9f654e"/><path d="M4 441L158 467V620L4 597Z" fill="url(#arrival-windows)"/><path d="M40 645v-65l45 8v66" fill="#725743"/><path d="M184 514L279 532V710L184 692Z" fill="#ad735c"/><path d="M200 549L264 561V659L200 648Z" fill="url(#arrival-windows)"/></g>
    <g fill="#324e3e"><path d="M83 757q-62-136-31-266l14 0q-12 165 46 271z"/><path d="M63 506q-77-65-154-8 84-6 144 28-48 4-111 70 80-40 127-57 51 54 111 53-61-68-98-75 58-16 94-52-79 0-113 41z"/></g>
    <g fill="#41684c"><ellipse cx="104" cy="751" rx="99" ry="34"/><ellipse cx="205" cy="893" rx="122" ry="55"/><ellipse cx="37" cy="912" rx="87" ry="104"/></g>
    <g fill="#e0a675"><circle cx="165" cy="883" r="7"/><circle cx="225" cy="907" r="6"/><circle cx="80" cy="747" r="5"/></g>
    <g fill="#375856"><path d="M647 606q9-13 19 0v29h-19z"/><circle cx="657" cy="595" r="7"/><path d="M654 633l-3 23m10-23 4 23" stroke="#375856" strokeWidth="4"/></g>
  </svg>;
}
