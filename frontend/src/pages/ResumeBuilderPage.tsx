import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Plus,
  Trash2,
  Download,
  GraduationCap,
  Briefcase,
  Code,
  Award,
  FolderGit2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Save,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Printer,
  UploadCloud,
  FileUp,
  DownloadCloud,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';
import {
  ICON_EMAIL,
  ICON_LOCATION,
  ICON_PHONE,
  ICON_LINKEDIN,
  ICON_GITHUB,
} from './resumeIcons';

// ─── Data Types ──────────────────────────────────────────────────────────────

export interface EducationItem {
  id: string;
  institution: string;
  location: string;
  degree: string;
  startYear: string;
  endYear: string;
  cgpa: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  location: string;
  role: string;
  duration: string;
  points: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  tech: string;
  date: string;
  repoLink: string;
  points: string[];
}

export interface TechnicalSkills {
  languages: string;
  webTechnologies: string;
  toolsPlatforms: string;
  coreConcepts: string;
}

export interface CertificationItem {
  id: string;
  title: string;
  link: string;
}

export interface CompetitiveItem {
  id: string;
  platform: string;
  details: string;
  link: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
}

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinText: string;
  linkedinUrl: string;
  githubText: string;
  githubUrl: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  technicalSkills: TechnicalSkills;
  certifications: CertificationItem[];
  competitiveProgramming: CompetitiveItem[];
  achievements: AchievementItem[];
}

// ─── Default Data Matching the Exact Uploaded Resume ─────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

export const exactDocxDefaultData: ResumeData = {
  fullName: 'M DHAANISH NIHAAL',
  email: 'kit27.am13@gmail.com',
  phone: '+91 9566594701',
  location: 'Coimbatore, Tamil Nadu',
  linkedinText: 'Dhaanish Nihaal',
  linkedinUrl: 'https://linkedin.com/in/DhaanishNihaal',
  githubText: 'DhaanishNihaal',
  githubUrl: 'https://github.com/DhaanishNihaal',
  education: [
    {
      id: uid(),
      institution: 'KIT-KalaignarKarunanidhi Institute Of Technology',
      location: 'Coimbatore, India',
      degree: 'BE Computer Science Engineering (AI & ML) - CGPA: 7.7/10.0',
      startYear: '2023',
      endYear: '2027',
      cgpa: '7.7/10.0',
    },
  ],
  experience: [
    {
      id: uid(),
      company: 'Appin Technology Private Limited',
      location: 'Coimbatore, India',
      role: 'Full Stack Development Implant Training',
      duration: 'Dec 2024',
      points: [
        'Gained hands-on experience in HTML, CSS, JavaScript, and Bootstrap by building responsive and user-friendly web pages.',
        'Implemented clean front-end UI components and ensured a smooth experience.',
      ],
    },
    {
      id: uid(),
      company: 'LearnLogicify Technologies',
      location: 'Coimbatore, India',
      role: 'Full Stack Development Intern',
      duration: 'Jun 2025',
      points: [
        'Designed UI pages including login, dashboards, and order management interfaces.',
        'Improved application reliability by applying structured exception handling and robust error-handling practices.',
      ],
    },
  ],
  projects: [
    {
      id: uid(),
      name: 'SplitUp-Multiuser Expense Manager',
      tech: 'React Native, Java, Spring Boot, MySQL, Maven, REST APIs',
      date: 'Jan 2026',
      repoLink: 'https://github.com/DhaanishNihaal',
      points: [
        'Developed a mobile-based expense management system for multiple users with group creation, shared expense tracking and settlements.',
        'Built a React Native mobile frontend and implemented messaging features to facilitate communication between group members.',
        'Designed RESTful APIs using Spring Boot and managed persistent storage using MySQL.',
        'Maintained separate development and production branches using GitHub and deployed the production build on Render with Neon PostgreSQL.',
      ],
    },
    {
      id: uid(),
      name: 'Expense Tracker',
      tech: 'Java, Swing, MySQL, Maven',
      date: 'Aug 2024',
      repoLink: 'https://github.com/DhaanishNihaal',
      points: [
        'Created a Java Swing–based expense management application with CRUD operations and MySQL-backed data persistence.',
        'Designed relational database schemas in MySQL and executed secure queries using JDBC.',
        'Built an intuitive desktop UI with filtering, date-based tracking, and category-wise expense analysis.',
      ],
    },
    {
      id: uid(),
      name: 'Task Scheduler',
      tech: 'Java, Spring Boot, Maven, REST APIs, DSA',
      date: 'Sep 2025',
      repoLink: 'https://github.com/DhaanishNihaal',
      points: [
        'Built a backend task scheduling system using graph algorithms, cycle detection, and priority-based topological sorting to compute optimal execution order.',
        'Implemented RESTful APIs with Spring Boot and managed task dependencies using adjacency lists and in-degree tracking.',
        'Used Maven for dependency management and designed modular services for scalability and maintainability.',
      ],
    },
    {
      id: uid(),
      name: 'WatchBuddy',
      tech: 'React.js, Flask (Python), Pandas, Railway/Vercel',
      date: 'Apr 2024',
      repoLink: 'https://github.com/DhaanishNihaal',
      points: [
        'Developed a full-stack movie recommendation platform with a React frontend and Flask backend.',
        'Implemented REST APIs in Flask to serve ML-based recommendations using Pandas for data processing.',
        'Deployed frontend on Vercel and backend on Railway ensuring fast response times and reliable availability.',
      ],
    },
  ],
  technicalSkills: {
    languages: 'Java, Python, C, C++, JavaScript, SQL',
    webTechnologies: 'React.js, React Native, Node.js, Express.js, Next.js, Spring Boot, HTML, CSS, Bootstrap',
    toolsPlatforms: 'Git, GitHub, Maven, MongoDB, PostgreSQL, Render, Neon, Streamlit',
    coreConcepts: 'Data Structures & Algorithms (DSA), OOPs, Operating Systems, System Design',
  },
  certifications: [
    { id: uid(), title: 'Infosys SpringBoard-Java Foundation', link: 'https://example.com' },
    { id: uid(), title: 'AWS – Cloud Foundations', link: 'https://example.com' },
    { id: uid(), title: 'Cursa – Operating System and System Programming', link: 'https://example.com' },
    { id: uid(), title: 'Scaler – Supervised Machine Learning', link: 'https://example.com' },
    { id: uid(), title: 'Coursera – HTML, CSS and JavaScript for Web Developers', link: 'https://example.com' },
    { id: uid(), title: 'NPTEL – cloud computing(Elite)', link: 'https://example.com' },
  ],
  competitiveProgramming: [
    {
      id: uid(),
      platform: 'CodeChef',
      details: 'Max Rating 1887 (4 Star) | Highest Rank: 13 in Starters 213 (Div 3) | Global Rank: 9980',
      link: 'https://www.codechef.com',
    },
    {
      id: uid(),
      platform: 'LeetCode',
      details: 'Max Rating 1840(Knight) | Top 19.95% Globally | Solved 300+ Problems',
      link: 'https://leetcode.com',
    },
    {
      id: uid(),
      platform: 'Codeforces',
      details: 'Max Rating 1241 (pupil) | Solved 14 Problems',
      link: 'https://codeforces.com',
    },
    {
      id: uid(),
      platform: 'GeeksforGeeks',
      details: 'Solved 100+ DSA problems across arrays, strings, trees, graphs, and dynamic programming',
      link: 'https://geeksforgeeks.org',
    },
    {
      id: uid(),
      platform: 'Overall Performance',
      details: 'Solved 750+ problems across platforms | Participated in 90+ contests | 200+ active coding days',
      link: 'https://example.com',
    },
  ],
  achievements: [
    {
      id: uid(),
      title: 'Paper Presentation',
      description: 'Secured 3rd place in Sakura 2025 at Hindusthan College of Engineering and Technology for a project on Aircraft Engine Maintenance Using Machine Learning.',
    },
    {
      id: uid(),
      title: 'Full-Stack Projects',
      description: 'Successfully built and deployed WatchBuddy, VoicePass, and a Java Expense Tracker, demonstrating strong frontend, backend, and ML integration skills.',
    },
    {
      id: uid(),
      title: 'DSA Practice',
      description: 'Actively solved 128+ Medium and 40 Hard problems across LeetCode and CodeChef to strengthen foundations.',
    },
  ],
};

const STORAGE_KEY = 'mockera_saved_resume_data';

// ─── 1-Page Exact Document Component (1000% Identical to User's Sample) ───────

export const ExactDocxMatchingPreview: React.FC<{
  data: ResumeData;
  textScale?: number;
  spacingDensity?: 'compact' | 'balanced' | 'spacious';
}> = ({ data, textScale = 1.0, spacingDensity = 'balanced' }) => {
  const lineHeight = spacingDensity === 'compact' ? 1.18 : spacingDensity === 'spacious' ? 1.34 : 1.25;
  const itemMb = spacingDensity === 'compact' ? '0.8px' : spacingDensity === 'spacious' ? '2.2px' : '1.5px';
  const nameSize = `${(22 * textScale).toFixed(1)}pt`;
  const locSize = `${(9.5 * textScale).toFixed(1)}pt`;
  const contactSize = `${(9.2 * textScale).toFixed(1)}pt`;
  const headingSize = `${(11 * textScale).toFixed(1)}pt`;
  const subHeadingSize = `${(9.8 * textScale).toFixed(1)}pt`;
  const detailSize = `${(9.2 * textScale).toFixed(1)}pt`;
  const bulletSize = `${(9.05 * textScale).toFixed(1)}pt`;
  const skillSize = `${(9.1 * textScale).toFixed(1)}pt`;
  const certSize = `${(9.0 * textScale).toFixed(1)}pt`;
  const cpSize = `${(9.1 * textScale).toFixed(1)}pt`;
  const achSize = `${(9.1 * textScale).toFixed(1)}pt`;

  return (
    <div
      id="exact-docx-sheet"
      className="bg-white text-black selection:bg-slate-200"
      style={{
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        padding: '8mm 7mm 7mm 7mm',
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: detailSize,
        lineHeight: lineHeight,
        color: '#000000',
        boxSizing: 'border-box',
        boxShadow: '0 0 35px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: spacingDensity === 'compact' ? 'flex-start' : 'space-between',
        gap: spacingDensity === 'compact' ? '6px' : undefined,
      }}
    >
      {/* ── HEADER (CLASSIC SERIF TEMPLATE AS FIRST REQUESTED) ─────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '1.5px' }}>
        {/* Name: Times New Roman, Bold, Uppercase */}
        <h1
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: nameSize,
            fontWeight: 'bold',
            letterSpacing: '0.04em',
            margin: '0 0 1px 0',
            textTransform: 'uppercase',
            color: '#000000',
            lineHeight: 1.15,
          }}
        >
          {data.fullName}
        </h1>

        {/* Location: Centered on its own line below Name */}
        {data.location && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              fontSize: locSize,
              marginTop: '1px',
              marginBottom: '2px',
              color: '#000000',
            }}
          >
            <img
              src={ICON_LOCATION}
              alt=""
              style={{ height: '11px', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
            />
            <span>{data.location}</span>
          </div>
        )}

        {/* Contact Links Row: Single line, Underlined links, Phone + Email + LinkedIn + GitHub */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: '12px',
            fontSize: contactSize,
            color: '#000000',
            lineHeight: 1.2,
          }}
        >
          {data.phone && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
              <img
                src={ICON_PHONE}
                alt=""
                style={{ height: '10px', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
              />
              <span>{data.phone}</span>
            </span>
          )}

          {data.email && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
              <img
                src={ICON_EMAIL}
                alt=""
                style={{ height: '9px', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
              />
              <a href={`mailto:${data.email}`} style={{ color: '#000000', textDecoration: 'underline' }}>
                {data.email}
              </a>
            </span>
          )}

          {data.linkedinText && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
              <img
                src={ICON_LINKEDIN}
                alt=""
                style={{ height: '10px', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
              />
              <a
                href={data.linkedinUrl || '#'}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#000000', textDecoration: 'underline' }}
              >
                {data.linkedinText}
              </a>
            </span>
          )}

          {data.githubText && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
              <img
                src={ICON_GITHUB}
                alt=""
                style={{ height: '11px', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
              />
              <a
                href={data.githubUrl || '#'}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#000000', textDecoration: 'underline' }}
              >
                {data.githubText}
              </a>
            </span>
          )}
        </div>
      </div>

      {/* ── 1. EDUCATION ─────────────────────────────────────────────────── */}
      {data.education && data.education.length > 0 && (
        <div>
          <div
            style={{
              fontSize: headingSize,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: '1.2',
            }}
          >
            EDUCATION
          </div>
          <hr style={{ border: 'none', borderTop: '0.8px solid #000000', margin: '1px 0 2.5px 0' }} />
          {data.education.map((edu) => (
            <div key={edu.id} style={{ marginBottom: itemMb }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 'bold', fontSize: subHeadingSize }}>{edu.institution}</span>
                <span style={{ fontWeight: 'bold', fontSize: locSize }}>{edu.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: detailSize }}>
                <span>{edu.degree}</span>
                <span>
                  {edu.startYear} – {edu.endYear}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 2. EXPERIENCE ────────────────────────────────────────────────── */}
      {data.experience && data.experience.length > 0 && (
        <div>
          <div
            style={{
              fontSize: headingSize,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: '1.2',
            }}
          >
            EXPERIENCE
          </div>
          <hr style={{ border: 'none', borderTop: '0.8px solid #000000', margin: '1px 0 2.5px 0' }} />
          {data.experience.map((exp) => (
            <div key={exp.id} style={{ marginBottom: itemMb }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 'bold', fontSize: subHeadingSize }}>{exp.company}</span>
                <span style={{ fontWeight: 'bold', fontSize: locSize }}>{exp.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: detailSize }}>
                <span>{exp.role}</span>
                <span>{exp.duration}</span>
              </div>
              {exp.points && exp.points.length > 0 && (
                <ul
                  style={{
                    margin: '1px 0 0 0',
                    paddingLeft: '16px',
                    listStyleType: 'disc',
                    fontSize: bulletSize,
                    lineHeight: lineHeight,
                  }}
                >
                  {exp.points.map((pt, idx) => (
                    <li key={idx} style={{ marginBottom: '1px' }}>
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 3. PROJECTS ──────────────────────────────────────────────────── */}
      {data.projects && data.projects.length > 0 && (
        <div>
          <div
            style={{
              fontSize: headingSize,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: '1.2',
            }}
          >
            PROJECTS
          </div>
          <hr style={{ border: 'none', borderTop: '0.8px solid #000000', margin: '1px 0 2.5px 0' }} />
          {data.projects.map((proj) => (
            <div key={proj.id} style={{ marginBottom: itemMb }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: subHeadingSize }}>
                  <span style={{ fontWeight: 'bold' }}>{proj.name}</span>
                  {proj.tech && <span> | {proj.tech}</span>}
                </div>
                <div style={{ fontSize: detailSize, whiteSpace: 'nowrap' }}>
                  <span>{proj.date}</span>
                  {proj.repoLink && (
                    <span>
                      {' '}
                      |{' '}
                      <a
                        href={proj.repoLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#0044cc', textDecoration: 'none' }}
                      >
                        Repo
                      </a>
                    </span>
                  )}
                </div>
              </div>
              {proj.points && proj.points.length > 0 && (
                <ul
                  style={{
                    margin: '1px 0 0 0',
                    paddingLeft: '16px',
                    listStyleType: 'disc',
                    fontSize: bulletSize,
                    lineHeight: lineHeight,
                  }}
                >
                  {proj.points.map((pt, idx) => (
                    <li key={idx} style={{ marginBottom: '1px' }}>
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 4. TECHNICAL SKILLS & CERTIFICATIONS (2-COLUMN BALANCED LAYOUT) ── */}
      <div>
        <div
          style={{
            fontSize: headingSize,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: '1.2',
          }}
        >
          TECHNICAL SKILLS &amp; CERTIFICATIONS
        </div>
        <hr style={{ border: 'none', borderTop: '0.8px solid #000000', margin: '1px 0 2.5px 0' }} />

        {/* 2-Column Side-by-Side Flex Container */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Left Column: Technical Skills */}
          <div style={{ flex: '1.15', minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', fontSize: subHeadingSize, marginBottom: '1px' }}>Technical Skills</div>
            <div style={{ fontSize: skillSize, lineHeight: lineHeight }}>
              <div style={{ marginBottom: '1.5px' }}>
                <span style={{ fontWeight: 'bold' }}>Languages: </span>
                <span>{data.technicalSkills.languages}</span>
              </div>
              <div style={{ marginBottom: '1.5px' }}>
                <span style={{ fontWeight: 'bold' }}>Web Technologies: </span>
                <span>{data.technicalSkills.webTechnologies}</span>
              </div>
              <div style={{ marginBottom: '1.5px' }}>
                <span style={{ fontWeight: 'bold' }}>Tools &amp; Platforms: </span>
                <span>{data.technicalSkills.toolsPlatforms}</span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold' }}>Core Concepts: </span>
                <span>{data.technicalSkills.coreConcepts}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Certifications with right-aligned clean Link */}
          <div style={{ flex: '0.85', minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', fontSize: subHeadingSize, marginBottom: '1px' }}>Certifications</div>
            <div style={{ fontSize: certSize, lineHeight: lineHeight }}>
              {data.certifications &&
                data.certifications.map((cert) => (
                  <div
                    key={cert.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '6px',
                      marginBottom: '1.5px',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>{cert.title}</span>
                    {cert.link && (
                      <a
                        href={cert.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#0044cc',
                          textDecoration: 'none',
                          fontSize: detailSize,
                          whiteSpace: 'nowrap',
                          marginLeft: '6px',
                        }}
                      >
                        [Link]
                      </a>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. COMPETITIVE PROGRAMMING (1000% EXACT MATCH TO SAMPLE DOCX) ── */}
      {data.competitiveProgramming && data.competitiveProgramming.length > 0 && (
        <div>
          <div
            style={{
              fontSize: headingSize,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: '1.2',
            }}
          >
            COMPETITIVE PROGRAMMING
          </div>
          <hr style={{ border: 'none', borderTop: '0.8px solid #000000', margin: '1px 0 2.5px 0' }} />
          <div style={{ fontSize: cpSize, lineHeight: lineHeight }}>
            {data.competitiveProgramming.map((cp) => (
              <div
                key={cp.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '1px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 'bold' }}>{cp.platform}: </span>
                  <span>{cp.details}</span>
                </div>
                {cp.link && (
                  <a
                    href={cp.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#0044cc',
                      textDecoration: 'none',
                      fontSize: detailSize,
                      marginLeft: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    [Link]
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. ACHIEVEMENTS ──────────────────────────────────────────────── */}
      {data.achievements && data.achievements.length > 0 && (
        <div>
          <div
            style={{
              fontSize: headingSize,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: '1.2',
            }}
          >
            ACHIEVEMENTS
          </div>
          <hr style={{ border: 'none', borderTop: '0.8px solid #000000', margin: '1px 0 2.5px 0' }} />
          <div style={{ fontSize: achSize, lineHeight: lineHeight }}>
            {data.achievements.map((ach) => (
              <div key={ach.id} style={{ marginBottom: '2px' }}>
                <span style={{ fontWeight: 'bold' }}>{ach.title}: </span>
                <span>{ach.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
// ─── Input & Section Wrappers for the Editor ─────────────────────────────────

const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
}> = ({ title, icon, children, collapsible = false }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white dark:bg-surface-dark-elevated rounded-2xl border border-slate-200 dark:border-border-dark p-5 space-y-4 shadow-sm">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`flex items-center justify-between w-full ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          {icon}
          {title}
        </div>
        {collapsible && (open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
      </button>
      {open && children}
    </div>
  );
};

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
    <input
      {...props}
      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-surface-dark text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition placeholder:text-slate-300 dark:placeholder:text-slate-600"
    />
  </label>
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
    <textarea
      {...props}
      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-surface-dark text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-y"
    />
  </label>
);

// ─── Main Resume Builder Page Component ──────────────────────────────────────

export const ResumeBuilderPage: React.FC = () => {
  const { addToast } = useToast();
  const [data, setData] = useState<ResumeData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return exactDocxDefaultData;
  });

  const [isFullScreenView, setIsFullScreenView] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [textScale, setTextScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mockera_resume_text_scale');
      if (saved) return Number(saved);
    } catch {}
    return 1.0;
  });
  const [spacingDensity, setSpacingDensity] = useState<'compact' | 'balanced' | 'spacious'>(() => {
    try {
      const saved = localStorage.getItem('mockera_resume_spacing_density');
      if (saved && (saved === 'compact' || saved === 'balanced' || saved === 'spacious')) {
        return saved;
      }
    } catch {}
    return 'balanced';
  });

  // Auto-persist textScale and spacingDensity
  useEffect(() => {
    try {
      localStorage.setItem('mockera_resume_text_scale', String(textScale));
      localStorage.setItem('mockera_resume_spacing_density', spacingDensity);
    } catch {}
  }, [textScale, spacingDensity]);

  // Auto-persist to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data]);

  // Lock body scroll when in FullScreen mode
  useEffect(() => {
    if (isFullScreenView) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullScreenView]);

  const updateField = <K extends keyof ResumeData>(key: K, val: ResumeData[K]) => {
    setData((prev) => ({ ...prev, [key]: val }));
  };

  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Helper to map backend CandidateProfile or parsed data into ResumeData
  const applyProfileData = (profile: any) => {
    setData((prev) => {
      const candidate = profile.candidate || profile;

      // Parse LinkedIn username/display and URL
      const linkedinRaw = candidate.linkedin || candidate.linkedin_url || profile.linkedin || '';
      let linkedinUrl = linkedinRaw;
      let linkedinText = prev.linkedinText;
      if (linkedinRaw) {
        if (!linkedinRaw.startsWith('http')) {
          linkedinUrl = `https://linkedin.com/in/${linkedinRaw.replace(/.*linkedin\.com\/in\//, '')}`;
        }
        linkedinText = linkedinRaw.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '') || prev.linkedinText;
      }

      // Parse GitHub username/display and URL
      const githubRaw = candidate.github || candidate.github_url || profile.github || '';
      let githubUrl = githubRaw;
      let githubText = prev.githubText;
      if (githubRaw) {
        if (!githubRaw.startsWith('http')) {
          githubUrl = `https://github.com/${githubRaw.replace(/.*github\.com\//, '')}`;
        }
        githubText = githubRaw.replace(/https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '') || prev.githubText;
      }

      // Map Education
      const mappedEducation = Array.isArray(profile.education) && profile.education.length > 0
        ? profile.education.map((e: any) => ({
            id: uid(),
            institution: e.institution || e.school || e.college || '',
            location: e.location || '',
            degree: e.degree
              ? (e.field && !e.degree.includes(e.field) ? `${e.degree} (${e.field})` : e.degree)
              : (e.field || ''),
            startYear: String(e.start_year || e.startYear || e.year || ''),
            endYear: String(e.end_year || e.endYear || ''),
            cgpa: String(e.cgpa || e.gpa || ''),
          }))
        : prev.education;

      // Map Experience
      const mappedExperience = Array.isArray(profile.experience) && profile.experience.length > 0
        ? profile.experience.map((exp: any) => {
            const rawPoints = Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0
              ? exp.responsibilities
              : Array.isArray(exp.highlights) && exp.highlights.length > 0
              ? exp.highlights
              : Array.isArray(exp.points) && exp.points.length > 0
              ? exp.points
              : exp.description
              ? [exp.description]
              : [''];

            const startDate = exp.start_date || exp.startDate || '';
            const endDate = exp.end_date || exp.endDate || '';
            const duration = exp.duration || (startDate && endDate ? `${startDate} – ${endDate}` : (startDate || endDate || ''));

            return {
              id: uid(),
              company: exp.company || exp.organization || '',
              location: exp.location || '',
              role: exp.role || exp.title || exp.designation || '',
              duration,
              points: rawPoints,
            };
          })
        : prev.experience;

      // Map Projects
      const mappedProjects = Array.isArray(profile.projects) && profile.projects.length > 0
        ? profile.projects.map((proj: any) => {
            const rawBullets = Array.isArray(proj.key_contributions) && proj.key_contributions.length > 0
              ? proj.key_contributions
              : Array.isArray(proj.points) && proj.points.length > 0
              ? proj.points
              : Array.isArray(proj.highlights) && proj.highlights.length > 0
              ? proj.highlights
              : proj.description
              ? [proj.description]
              : [''];

            return {
              id: uid(),
              name: proj.name || proj.title || '',
              tech: Array.isArray(proj.technologies)
                ? proj.technologies.join(', ')
                : (proj.tech || ''),
              date: proj.date || proj.duration || '',
              repoLink: proj.link || proj.repoLink || proj.github || '',
              points: rawBullets,
            };
          })
        : prev.projects;

      // Map Skills
      const skills = profile.skills || {};
      const languages = Array.isArray(skills.programming_languages)
        ? skills.programming_languages.join(', ')
        : (skills.languages || prev.technicalSkills.languages);

      const webTech = [
        ...(Array.isArray(skills.frameworks) ? skills.frameworks : []),
        ...(Array.isArray(skills.libraries) ? skills.libraries : []),
      ].join(', ') || prev.technicalSkills.webTechnologies;

      const toolsPlatforms = [
        ...(Array.isArray(skills.tools) ? skills.tools : []),
        ...(Array.isArray(skills.cloud_devops) ? skills.cloud_devops : []),
        ...(Array.isArray(skills.databases) ? skills.databases : []),
      ].join(', ') || prev.technicalSkills.toolsPlatforms;

      const coreConcepts = Array.isArray(skills.other)
        ? skills.other.join(', ')
        : (skills.core_concepts || prev.technicalSkills.coreConcepts);

      // Map Certifications
      const mappedCertifications = Array.isArray(profile.certifications) && profile.certifications.length > 0
        ? profile.certifications.map((c: any) => {
            let title = '';
            if (typeof c === 'string') {
              title = c;
            } else {
              title = c.name || c.title || '';
              if (c.issuer && !title.includes(c.issuer)) {
                title = `${c.issuer} – ${title}`;
              }
            }
            return {
              id: uid(),
              title,
              link: (c as any).link || (c as any).url || '',
            };
          })
        : prev.certifications;

      // Map Achievements
      const mappedAchievements = Array.isArray(profile.achievements) && profile.achievements.length > 0
        ? profile.achievements.map((a: any) => {
            if (typeof a === 'string') {
              const colonIdx = a.indexOf(':');
              if (colonIdx > 0 && colonIdx < 35) {
                return {
                  id: uid(),
                  title: a.substring(0, colonIdx).trim(),
                  description: a.substring(colonIdx + 1).trim(),
                };
              }
              return {
                id: uid(),
                title: 'Achievement',
                description: a,
              };
            }
            return {
              id: uid(),
              title: a.title || 'Achievement',
              description: a.description || a.detail || '',
            };
          })
        : prev.achievements;

      // Map Competitive Programming if available
      let mappedCp = prev.competitiveProgramming;
      if (profile.competitive_programming) {
        const cpData = profile.competitive_programming;
        if (Array.isArray(cpData.platforms) && cpData.platforms.length > 0) {
          mappedCp = cpData.platforms.map((p: string) => ({
            id: uid(),
            platform: p,
            details: cpData.ratings || cpData.problems_solved || '',
            link: '',
          }));
        }
      }

      return {
        fullName: candidate.name || profile.name || prev.fullName,
        email: candidate.email && candidate.email !== '[EMAIL]' ? candidate.email : prev.email,
        phone: candidate.phone && candidate.phone !== '[PHONE]' ? candidate.phone : prev.phone,
        location: candidate.location || profile.location || prev.location,
        linkedinText,
        linkedinUrl,
        githubText,
        githubUrl,
        education: mappedEducation,
        experience: mappedExperience,
        projects: mappedProjects,
        technicalSkills: {
          languages,
          webTechnologies: webTech,
          toolsPlatforms,
          coreConcepts,
        },
        certifications: mappedCertifications,
        competitiveProgramming: mappedCp,
        achievements: mappedAchievements,
      };
    });
  };

  // Upload existing PDF resume to auto-fill
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingPdf(true);
    try {
      const res = await apiService.analyzeResume(file);
      const profile = (res as any)?.candidate_profile || res;
      if (profile) {
        applyProfileData(profile);
        addToast('success', 'Resume Imported Successfully!', 'Extracted details mapped into this 1-page template.');
      }
    } catch (err: any) {
      addToast('error', 'Import Failed', err.message || 'Unable to parse PDF. Please try another file.');
    } finally {
      setIsImportingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // 1-Click Load from user's account profile
  const handleLoadFromProfile = async () => {
    try {
      const profile = await apiService.getCandidateProfile();
      if (profile && (profile.candidate || (profile as any).name)) {
        applyProfileData(profile);
        addToast('success', 'Profile Data Loaded!', 'Your existing candidate profile data has been applied.');
      } else {
        addToast('info', 'No Saved Profile', 'Please upload your resume PDF to extract details.');
      }
    } catch {
      addToast('error', 'Fetch Failed', 'Could not load existing candidate profile.');
    }
  };

  // Export JSON backup
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.fullName || 'Resume').replace(/\s+/g, '_')}_Backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Backup Exported', 'Resume data downloaded as JSON backup.');
  };

  // Import JSON backup
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          setData(parsed);
          addToast('success', 'Backup Restored', 'Resume updated from JSON backup file.');
        }
      } catch {
        addToast('error', 'Invalid File', 'Could not read JSON resume file.');
      } finally {
        if (jsonInputRef.current) jsonInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Education Helpers
  const addEducation = () => {
    updateField('education', [
      ...data.education,
      { id: uid(), institution: '', location: '', degree: '', startYear: '', endYear: '', cgpa: '' },
    ]);
  };
  const removeEducation = (id: string) => {
    updateField('education', data.education.filter((e) => e.id !== id));
  };
  const updateEducation = (id: string, field: keyof EducationItem, val: string) => {
    updateField('education', data.education.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  };

  // Experience Helpers
  const addExperience = () => {
    updateField('experience', [
      ...data.experience,
      { id: uid(), company: '', location: '', role: '', duration: '', points: [''] },
    ]);
  };
  const removeExperience = (id: string) => {
    updateField('experience', data.experience.filter((e) => e.id !== id));
  };
  const updateExperience = (id: string, field: keyof ExperienceItem, val: any) => {
    updateField('experience', data.experience.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  };
  const updateExperiencePoint = (expId: string, pointIndex: number, val: string) => {
    updateField(
      'experience',
      data.experience.map((e) =>
        e.id === expId ? { ...e, points: e.points.map((p, idx) => (idx === pointIndex ? val : p)) } : e
      )
    );
  };
  const addExperiencePoint = (expId: string) => {
    updateField(
      'experience',
      data.experience.map((e) => (e.id === expId ? { ...e, points: [...e.points, ''] } : e))
    );
  };
  const removeExperiencePoint = (expId: string, pointIndex: number) => {
    updateField(
      'experience',
      data.experience.map((e) =>
        e.id === expId ? { ...e, points: e.points.filter((_, idx) => idx !== pointIndex) } : e
      )
    );
  };

  // Projects Helpers
  const addProject = () => {
    updateField('projects', [
      ...data.projects,
      { id: uid(), name: '', tech: '', date: '', repoLink: '', points: [''] },
    ]);
  };
  const removeProject = (id: string) => {
    updateField('projects', data.projects.filter((p) => p.id !== id));
  };
  const updateProject = (id: string, field: keyof ProjectItem, val: any) => {
    updateField('projects', data.projects.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };
  const updateProjectPoint = (projId: string, pointIndex: number, val: string) => {
    updateField(
      'projects',
      data.projects.map((p) =>
        p.id === projId ? { ...p, points: p.points.map((pt, idx) => (idx === pointIndex ? val : pt)) } : p
      )
    );
  };
  const addProjectPoint = (projId: string) => {
    updateField(
      'projects',
      data.projects.map((p) => (p.id === projId ? { ...p, points: [...p.points, ''] } : p))
    );
  };
  const removeProjectPoint = (projId: string, pointIndex: number) => {
    updateField(
      'projects',
      data.projects.map((p) =>
        p.id === projId ? { ...p, points: p.points.filter((_, idx) => idx !== pointIndex) } : p
      )
    );
  };

  // Competitive Programming Helpers
  const addCompetitive = () => {
    updateField('competitiveProgramming', [
      ...data.competitiveProgramming,
      { id: uid(), platform: '', details: '', link: '' },
    ]);
  };
  const removeCompetitive = (id: string) => {
    updateField('competitiveProgramming', data.competitiveProgramming.filter((c) => c.id !== id));
  };
  const updateCompetitive = (id: string, field: keyof CompetitiveItem, val: string) => {
    updateField(
      'competitiveProgramming',
      data.competitiveProgramming.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  // Certifications Helpers
  const addCertification = () => {
    updateField('certifications', [
      ...data.certifications,
      { id: uid(), title: '', link: '' },
    ]);
  };
  const removeCertification = (id: string) => {
    updateField('certifications', data.certifications.filter((c) => c.id !== id));
  };
  const updateCertification = (id: string, field: keyof CertificationItem, val: string) => {
    updateField(
      'certifications',
      data.certifications.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  // Achievements Helpers
  const addAchievement = () => {
    updateField('achievements', [
      ...data.achievements,
      { id: uid(), title: '', description: '' },
    ]);
  };
  const removeAchievement = (id: string) => {
    updateField('achievements', data.achievements.filter((a) => a.id !== id));
  };
  const updateAchievement = (id: string, field: keyof AchievementItem, val: string) => {
    updateField(
      'achievements',
      data.achievements.map((a) => (a.id === id ? { ...a, [field]: val } : a))
    );
  };

  // Reordering helpers (Move Up / Down)
  const moveItem = <T,>(arr: T[], index: number, direction: 'up' | 'down'): T[] => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= arr.length) return arr;
    const newArr = [...arr];
    const [moved] = newArr.splice(index, 1);
    newArr.splice(targetIndex, 0, moved);
    return newArr;
  };

  const moveEducation = (index: number, direction: 'up' | 'down') => {
    updateField('education', moveItem(data.education, index, direction));
  };

  const moveExperience = (index: number, direction: 'up' | 'down') => {
    updateField('experience', moveItem(data.experience, index, direction));
  };

  const moveProject = (index: number, direction: 'up' | 'down') => {
    updateField('projects', moveItem(data.projects, index, direction));
  };

  const moveCertification = (index: number, direction: 'up' | 'down') => {
    updateField('certifications', moveItem(data.certifications, index, direction));
  };

  const moveCompetitive = (index: number, direction: 'up' | 'down') => {
    updateField('competitiveProgramming', moveItem(data.competitiveProgramming, index, direction));
  };

  const moveAchievement = (index: number, direction: 'up' | 'down') => {
    updateField('achievements', moveItem(data.achievements, index, direction));
  };

  // Save & Open Full Screen View
  const handleSaveAndFinish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      addToast('success', 'Resume Saved Successfully!', 'Opening full screen resume view.');
    } catch {
      // fallback
    }
    setIsFullScreenView(true);
  };

  // Print Handler (Strictly 1-Page A4 print)
  const handlePrint = () => {
    const content = document.getElementById('exact-docx-sheet');
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.fullName} - Resume</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            background: #ffffff !important;
            font-family: 'Times New Roman', Times, serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
          #exact-docx-sheet {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 8mm 7mm 7mm 7mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: ${spacingDensity === 'compact' ? 'flex-start' : 'space-between'} !important;
          }
          a {
            color: #0044cc !important;
            text-decoration: none !important;
          }
          .contact-link {
            color: #000000 !important;
            text-decoration: none !important;
          }
        </style>
      </head>
      <body>
        ${content.outerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleReset = () => {
    if (window.confirm('Reset resume data back to default template?')) {
      setData(exactDocxDefaultData);
      localStorage.removeItem(STORAGE_KEY);
      addToast('info', 'Template Reset', 'Loaded original sample template data.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-dark px-4 py-6">
      {/* ── IMMERSIVE FULL SCREEN VIEW MODAL (Exact match for user screenshot) ── */}
      {isFullScreenView && (
        <div className="fixed inset-0 z-[9999] bg-[#2d3134] flex flex-col overflow-hidden animate-fadeIn">
          {/* Top Sticky ToolBar */}
          <div className="h-16 shrink-0 bg-[#1e2124] border-b border-black/40 px-4 md:px-8 flex items-center justify-between text-white shadow-lg select-none">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFullScreenView(false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Editor
              </button>
              <div className="h-5 w-[1px] bg-slate-700 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  Full Screen Resume View
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Exact 1-Page A4
                </span>
              </div>
            </div>

            {/* Center: Spacing, Text Size & Zoom Controls */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Text Size Scale */}
              <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl px-2 py-1 border border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 hidden md:inline">
                  Text:
                </span>
                <button
                  onClick={() => setTextScale((s) => Math.max(0.85, Number((s - 0.05).toFixed(2))))}
                  className="px-2 py-0.5 rounded text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  title="Smaller Text"
                >
                  A-
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-300 w-8 text-center">
                  {Math.round(textScale * 100)}%
                </span>
                <button
                  onClick={() => setTextScale((s) => Math.min(1.15, Number((s + 0.05).toFixed(2))))}
                  className="px-2 py-0.5 rounded text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  title="Larger Text"
                >
                  A+
                </button>
              </div>

              {/* Spacing Density */}
              <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 hidden md:inline">
                  Spacing:
                </span>
                {(['compact', 'balanced', 'spacious'] as const).map((density) => (
                  <button
                    key={density}
                    onClick={() => setSpacingDensity(density)}
                    className={`px-2 py-0.5 rounded text-xs font-bold capitalize transition ${
                      spacingDensity === density
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {density}
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl px-2 py-1 border border-slate-700/60">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-300 w-11 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition text-[10px] font-bold"
                  title="Reset to 100%"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/30 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Print"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullScreenView(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Close Full Screen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Full-Screen Scrollable Document Canvas */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.12s ease-out',
                marginBottom: '40px',
              }}
              className="transition-all"
            >
              <ExactDocxMatchingPreview data={data} textScale={textScale} spacingDensity={spacingDensity} />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Top Header Bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-surface-dark-elevated p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Campus Placement Resume Template</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Exact 1-Page Guaranteed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Standard single-page engineering format (Times New Roman, 2-column skills/certifications, exact icons).
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setIsFullScreenView(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-surface-dark dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Full Screen View
            </button>
            <button
              onClick={handleSaveAndFinish}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/25 transition active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              Save &amp; View Full Screen
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              title="Reset to Template Default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Hidden File Inputs for Import */}
        <input
          type="file"
          ref={pdfInputRef}
          onChange={handlePdfUpload}
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
        />
        <input
          type="file"
          ref={jsonInputRef}
          onChange={handleImportJson}
          accept=".json,application/json"
          className="hidden"
        />

        {/* ── UPDATE EXISTING RESUME / IMPORT BAR ── */}
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-surface-dark-elevated p-4 sm:p-5 rounded-3xl border border-blue-200/80 dark:border-blue-900/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Updating an Existing Resume?
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  AI Auto-Fill
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload your existing PDF or Word (.docx) resume — AI will automatically map your real data into this exact placement template!
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {/* Import PDF / DOCX Resume */}
            <button
              type="button"
              disabled={isImportingPdf}
              onClick={() => pdfInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {isImportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <FileUp className="w-3.5 h-3.5" />
                  Upload Resume (PDF / Word)
                </>
              )}
            </button>

            {/* Load from Profile */}
            <button
              type="button"
              onClick={handleLoadFromProfile}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-surface-dark dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark transition shadow-sm"
              title="Auto-fill details from your uploaded candidate profile"
            >
              <User className="w-3.5 h-3.5 text-brand-500" />
              From My Profile
            </button>

            {/* Import JSON */}
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-surface-dark dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark transition shadow-sm"
              title="Upload previously exported JSON resume file"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
              Import Backup
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-surface-dark dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark transition shadow-sm"
              title="Save a JSON backup of this resume on your computer"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-emerald-500" />
              Save Backup
            </button>
          </div>
        </div>

        {/* ── SIDE-BY-SIDE EDITOR & LIVE PREVIEW ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left 6 Columns: Form Controls */}
          <div className="xl:col-span-6 space-y-6">
            {/* Personal Information */}
            <SectionCard title="Contact Header & Socials" icon={<User className="w-4 h-4 text-brand-500" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormInput
                    label="Candidate Full Name (All Caps)"
                    value={data.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                  />
                </div>
                <FormInput
                  label="Phone Number"
                  value={data.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
                <FormInput
                  label="Email Address"
                  type="email"
                  value={data.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
                <div className="sm:col-span-2">
                  <FormInput
                    label="Location (City, State - Centered on Line 2)"
                    value={data.location}
                    onChange={(e) => updateField('location', e.target.value)}
                  />
                </div>
                <FormInput
                  label="LinkedIn Display Name"
                  value={data.linkedinText}
                  onChange={(e) => updateField('linkedinText', e.target.value)}
                />
                <FormInput
                  label="LinkedIn URL"
                  value={data.linkedinUrl}
                  onChange={(e) => updateField('linkedinUrl', e.target.value)}
                />
                <FormInput
                  label="GitHub Display Username"
                  value={data.githubText}
                  onChange={(e) => updateField('githubText', e.target.value)}
                />
                <FormInput
                  label="GitHub URL"
                  value={data.githubUrl}
                  onChange={(e) => updateField('githubUrl', e.target.value)}
                />
              </div>
            </SectionCard>

            {/* Education */}
            <SectionCard title="Education" icon={<GraduationCap className="w-4 h-4 text-emerald-500" />}>
              {data.education.map((edu, idx) => (
                <div
                  key={edu.id}
                  className="border border-slate-200 dark:border-border-dark rounded-xl p-4 space-y-3 relative bg-slate-50/50 dark:bg-surface-dark/40"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      College / School #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveEducation(idx, 'up')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Education Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === data.education.length - 1}
                        onClick={() => moveEducation(idx, 'down')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Education Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {data.education.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEducation(edu.id)}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 ml-1 transition"
                          title="Delete Education"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <FormInput
                    label="Institution Name"
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormInput
                      label="Location (e.g. Coimbatore, India)"
                      value={edu.location}
                      onChange={(e) => updateEducation(edu.id, 'location', e.target.value)}
                    />
                    <FormInput
                      label="Degree & Major (with CGPA)"
                      value={edu.degree}
                      onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                    />
                    <FormInput
                      label="Start Year"
                      value={edu.startYear}
                      onChange={(e) => updateEducation(edu.id, 'startYear', e.target.value)}
                    />
                    <FormInput
                      label="End Year / Expected"
                      value={edu.endYear}
                      onChange={(e) => updateEducation(edu.id, 'endYear', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addEducation}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Education
              </button>
            </SectionCard>

            {/* Experience */}
            <SectionCard title="Experience / Internships" icon={<Briefcase className="w-4 h-4 text-blue-500" />}>
              {data.experience.map((exp, idx) => (
                <div
                  key={exp.id}
                  className="border border-slate-200 dark:border-border-dark rounded-xl p-4 space-y-3 relative bg-slate-50/50 dark:bg-surface-dark/40"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Experience #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveExperience(idx, 'up')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Experience Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === data.experience.length - 1}
                        onClick={() => moveExperience(idx, 'down')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Experience Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {data.experience.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExperience(exp.id)}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 ml-1 transition"
                          title="Delete Experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormInput
                      label="Company Name"
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                    />
                    <FormInput
                      label="Location (City, Country)"
                      value={exp.location}
                      onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                    />
                    <FormInput
                      label="Role / Designation"
                      value={exp.role}
                      onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                    />
                    <FormInput
                      label="Date / Duration (e.g. Dec 2024)"
                      value={exp.duration}
                      onChange={(e) => updateExperience(exp.id, 'duration', e.target.value)}
                    />
                  </div>
                  {/* Bullet Points */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Bullet Points
                    </span>
                    {exp.points.map((pt, pIdx) => (
                      <div key={pIdx} className="flex gap-2">
                        <input
                          value={pt}
                          onChange={(e) => updateExperiencePoint(exp.id, pIdx, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        {exp.points.length > 1 && (
                          <button
                            onClick={() => removeExperiencePoint(exp.id, pIdx)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addExperiencePoint(exp.id)}
                      className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Responsibility Bullet
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addExperience}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience Entry
              </button>
            </SectionCard>

            {/* Projects */}
            <SectionCard title="Projects" icon={<FolderGit2 className="w-4 h-4 text-purple-500" />}>
              {data.projects.map((proj, idx) => (
                <div
                  key={proj.id}
                  className="border border-slate-200 dark:border-border-dark rounded-xl p-4 space-y-3 relative bg-slate-50/50 dark:bg-surface-dark/40"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Project #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveProject(idx, 'up')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Project Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === data.projects.length - 1}
                        onClick={() => moveProject(idx, 'down')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Project Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {data.projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProject(proj.id)}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 ml-1 transition"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormInput
                      label="Project Title"
                      value={proj.name}
                      onChange={(e) => updateProject(proj.id, 'name', e.target.value)}
                    />
                    <FormInput
                      label="Date (e.g. Jan 2026)"
                      value={proj.date}
                      onChange={(e) => updateProject(proj.id, 'date', e.target.value)}
                    />
                    <div className="sm:col-span-2">
                      <FormInput
                        label="Technologies Used"
                        value={proj.tech}
                        onChange={(e) => updateProject(proj.id, 'tech', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FormInput
                        label="Repository URL (Optional)"
                        value={proj.repoLink}
                        onChange={(e) => updateProject(proj.id, 'repoLink', e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Bullets */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Description Bullets
                    </span>
                    {proj.points.map((pt, pIdx) => (
                      <div key={pIdx} className="flex gap-2">
                        <input
                          value={pt}
                          onChange={(e) => updateProjectPoint(proj.id, pIdx, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        {proj.points.length > 1 && (
                          <button
                            onClick={() => removeProjectPoint(proj.id, pIdx)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addProjectPoint(proj.id)}
                      className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Project Bullet
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addProject}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project Entry
              </button>
            </SectionCard>

            {/* Technical Skills & Certifications side-by-side controls */}
            <div className="grid grid-cols-1 gap-6">
              <SectionCard title="Technical Skills" icon={<Code className="w-4 h-4 text-indigo-500" />}>
                <div className="space-y-3">
                  <FormInput
                    label="Languages"
                    value={data.technicalSkills.languages}
                    onChange={(e) =>
                      updateField('technicalSkills', { ...data.technicalSkills, languages: e.target.value })
                    }
                  />
                  <FormInput
                    label="Web Technologies"
                    value={data.technicalSkills.webTechnologies}
                    onChange={(e) =>
                      updateField('technicalSkills', { ...data.technicalSkills, webTechnologies: e.target.value })
                    }
                  />
                  <FormInput
                    label="Tools & Platforms"
                    value={data.technicalSkills.toolsPlatforms}
                    onChange={(e) =>
                      updateField('technicalSkills', { ...data.technicalSkills, toolsPlatforms: e.target.value })
                    }
                  />
                  <FormInput
                    label="Core Concepts"
                    value={data.technicalSkills.coreConcepts}
                    onChange={(e) =>
                      updateField('technicalSkills', { ...data.technicalSkills, coreConcepts: e.target.value })
                    }
                  />
                </div>
              </SectionCard>

              <SectionCard title="Certifications (Right Column)" icon={<Award className="w-4 h-4 text-amber-600" />}>
                {data.certifications.map((cert, idx) => (
                  <div
                    key={cert.id}
                    className="flex gap-2 items-center border border-slate-200 dark:border-border-dark rounded-xl p-2.5 bg-slate-50/50 dark:bg-surface-dark/40"
                  >
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveCertification(idx, 'up')}
                        className="p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-20 disabled:hover:text-slate-400 transition"
                        title="Move Certification Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === data.certifications.length - 1}
                        onClick={() => moveCertification(idx, 'down')}
                        className="p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-20 disabled:hover:text-slate-400 transition"
                        title="Move Certification Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      value={cert.title}
                      placeholder="Certification Title"
                      onChange={(e) => updateCertification(cert.id, 'title', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark text-xs text-slate-800 dark:text-slate-100"
                    />
                    <input
                      value={cert.link}
                      placeholder="Link URL"
                      onChange={(e) => updateCertification(cert.id, 'link', e.target.value)}
                      className="w-40 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark text-xs text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeCertification(cert.id)}
                      className="text-red-400 hover:text-red-600 px-1"
                      title="Delete Certification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCertification}
                  className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline pt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Certification
                </button>
              </SectionCard>
            </div>

            {/* Competitive Programming */}
            <SectionCard title="Competitive Programming" icon={<Trophy className="w-4 h-4 text-amber-500" />}>
              {data.competitiveProgramming.map((cp, idx) => (
                <div
                  key={cp.id}
                  className="border border-slate-200 dark:border-border-dark rounded-xl p-3 space-y-2 relative bg-slate-50/50 dark:bg-surface-dark/40"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Profile #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveCompetitive(idx, 'up')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Profile Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === data.competitiveProgramming.length - 1}
                        onClick={() => moveCompetitive(idx, 'down')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Profile Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {data.competitiveProgramming.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCompetitive(cp.id)}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 ml-1 transition"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormInput
                      label="Platform (e.g. CodeChef, LeetCode)"
                      value={cp.platform}
                      onChange={(e) => updateCompetitive(cp.id, 'platform', e.target.value)}
                    />
                    <FormInput
                      label="Profile Link URL"
                      value={cp.link}
                      onChange={(e) => updateCompetitive(cp.id, 'link', e.target.value)}
                    />
                  </div>
                  <FormInput
                    label="Rating / Solved Stats"
                    value={cp.details}
                    onChange={(e) => updateCompetitive(cp.id, 'details', e.target.value)}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addCompetitive}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Competitive Profile
              </button>
            </SectionCard>

            {/* Achievements */}
            <SectionCard title="Achievements" icon={<Sparkles className="w-4 h-4 text-rose-500" />}>
              {data.achievements.map((ach, idx) => (
                <div
                  key={ach.id}
                  className="border border-slate-200 dark:border-border-dark rounded-xl p-3 space-y-2 relative bg-slate-50/50 dark:bg-surface-dark/40"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Achievement #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveAchievement(idx, 'up')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Achievement Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === data.achievements.length - 1}
                        onClick={() => moveAchievement(idx, 'down')}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        title="Move Achievement Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {data.achievements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAchievement(ach.id)}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 ml-1 transition"
                          title="Delete Achievement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <FormInput
                    label="Category / Heading (e.g. Paper Presentation)"
                    value={ach.title}
                    onChange={(e) => updateAchievement(ach.id, 'title', e.target.value)}
                  />
                  <FormTextarea
                    label="Achievement Details"
                    rows={2}
                    value={ach.description}
                    onChange={(e) => updateAchievement(ach.id, 'description', e.target.value)}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addAchievement}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Achievement
              </button>
            </SectionCard>

            {/* ── BIG SAVE & FINISH ACTION BAR AT BOTTOM ── */}
            <div className="bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/30 p-6 rounded-3xl border border-brand-200 dark:border-brand-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Done filling your details?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Save your resume and open it in the full-screen view just like the document.
                  </p>
                </div>
                <button
                  onClick={handleSaveAndFinish}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/25 transition active:scale-95 shrink-0"
                >
                  <Maximize2 className="w-4 h-4" />
                  Save &amp; View Full Screen
                </button>
              </div>
            </div>
          </div>

          {/* Right 6 Columns: Sticky Live Document Preview with 1-Page Indicator */}
          <div className="xl:col-span-6 sticky top-6 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  A4 Single-Page View
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  1 of 1 Page Only
                </span>
              </div>
              <button
                onClick={() => setIsFullScreenView(true)}
                className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Full Screen View
              </button>
            </div>

            {/* Live Document Density & Text Controls */}
            <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-100 dark:bg-surface-dark-elevated rounded-xl p-2 border border-slate-200 dark:border-border-dark">
              {/* Text Size Scale */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg px-2 py-0.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Text:</span>
                <button
                  type="button"
                  onClick={() => setTextScale((s) => Math.max(0.85, Number((s - 0.05).toFixed(2))))}
                  className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  title="Smaller Text"
                >
                  A-
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 w-8 text-center">
                  {Math.round(textScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setTextScale((s) => Math.min(1.15, Number((s + 0.05).toFixed(2))))}
                  className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  title="Larger Text"
                >
                  A+
                </button>
              </div>

              {/* Spacing Density */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">Spacing:</span>
                {(['compact', 'balanced', 'spacious'] as const).map((density) => (
                  <button
                    key={density}
                    type="button"
                    onClick={() => setSpacingDensity(density)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition ${
                      spacingDensity === density
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {density}
                  </button>
                ))}
              </div>
            </div>

            {/* Exact A4 Sheet Visualizer with 1-Page Frame (Zero Clipping) */}
            <div className="border border-slate-200 dark:border-border-dark rounded-2xl p-4 bg-slate-200/60 dark:bg-slate-900/40 overflow-x-auto shadow-inner flex items-start justify-center">
              <div
                style={{
                  width: 'calc(210mm * 0.74)',
                  height: 'calc(297mm * 0.74)',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    width: '210mm',
                    height: '297mm',
                    transform: 'scale(0.74)',
                    transformOrigin: 'top left',
                  }}
                >
                  <ExactDocxMatchingPreview data={data} textScale={textScale} spacingDensity={spacingDensity} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilderPage;
