import { useState, useEffect } from 'react';

export function useTheme() {
  const [minimal, setMinimal] = useState(() => localStorage.getItem('theme') === 'minimal');

  useEffect(() => {
    if (minimal) {
      document.documentElement.classList.add('minimal');
      localStorage.setItem('theme', 'minimal');
    } else {
      document.documentElement.classList.remove('minimal');
      localStorage.setItem('theme', 'pulperia');
    }
  }, [minimal]);

  const toggle = () => setMinimal(prev => !prev);

  return { minimal, toggle };
}
