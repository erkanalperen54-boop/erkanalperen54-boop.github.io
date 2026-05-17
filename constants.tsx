
import React from 'react';
import { NavItem, Certification } from './types';
import { Github, Linkedin, Mail, ExternalLink, ShieldCheck, Briefcase, Cpu, Award, Binary, Terminal, Box, Zap, Code2, FileCode } from 'lucide-react';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Certifications', path: '/certifications' },
  { label: 'Projects', path: '/projects' },
  { label: 'Contact', path: '/contact' }
];

export const PERSONAL_INFO = {
  name: "Alperen",
  level: " Lead Developer at Stux6 technology",
  company: "Stux6 Technology",
  companyUrl: "https://stux6-technology.github.io",
  github: "https://www.github.com/erkanalperen54-boop",
  email: "alperenerkan@alperenerkan.com",
  githubUsername: "erkanalperen54-boop"
};

export const CERTIFICATIONS: Certification[] = [
];

export const TECH_STACK = [
  { name: 'C/C++', icon: <Cpu className="w-5 h-5" /> },
  { name: 'x86_64 Assembly', icon: <Binary className="w-5 h-5" /> },
  { name: 'Python', icon: <Code2 className="w-5 h-5" /> },
  { name: 'Docker', icon: <Box className="w-5 h-5" /> },
  { name: 'Rust', icon: <Zap className="w-5 h-5" /> },
  { name: 'BASH / ZSH', icon: <Terminal className="w-5 h-5" /> },
  { name: 'BATCH', icon: <FileCode className="w-5 h-5" /> },
];
