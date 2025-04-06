import React from 'react';
import styles from './SocialLink.module.css';

type SocialLinkProps = {
  href: string;
  label: string;
  children: React.ReactNode;
};

const SocialLink: React.FC<SocialLinkProps> = ({ href, label, children }) => {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.socialLink}
      aria-label={label}
    >
      {children}
    </a>
  );
};

export default SocialLink;
