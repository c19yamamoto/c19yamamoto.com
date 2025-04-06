import React from 'react';
import SocialIcons from '../SocialIcons';
import styles from './styles.module.scss';

const ProfileSection: React.FC = () => {
  return (
    <div className={styles.container}>
      <SocialIcons />
    </div>
  );
};

export default ProfileSection;
