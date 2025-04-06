import React from 'react';
import SocialIcons from './SocialIcons';
import styles from './UnderConstruction.module.scss';

const UnderConstruction: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My website is currently under construction.</h1>
      <p className={styles.message}>
        新しいウェブサイトを準備中です。しばらくお待ちください。
      </p>
      <SocialIcons />
    </div>
  );
};

export default UnderConstruction;
