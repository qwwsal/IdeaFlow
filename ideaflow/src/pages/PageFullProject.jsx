import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './PageFullCase.module.css';

export default function PageFullProject() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`http://localhost:3001/projects/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Ошибка загрузки проекта: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setProjectData(data);
      })
      .catch(err => {
        console.error('Ошибка при загрузке проекта:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p>Загрузка проекта...</p>;
  if (error) return <p>Ошибка: {error}</p>;
  if (!projectData) return <p>Проект не найден</p>;

  return (
    <>
      <header className={styles.header}>
        <Link to="/">
          <img src="/images/logosmall.svg" alt="IdeaFlow logo" style={{ height: 80 }} />
        </Link>
        <nav className={styles.navLinks}>
          <Link to="/profile">Профиль</Link>
          <Link to="/cases">Кейсы</Link>
          <Link to="/projects">Проекты</Link>
          <Link to="/profile">
            <button className={styles.buttonYellow}>Разместить проект</button>
          </Link>
          <Link to="/cases">
            <button className={styles.buttonYellow}>Приступить к проекту</button>
          </Link>
        </nav>
      </header>

      <main className={styles.container}>
        <h1 className={styles.title}>{projectData.title}</h1>
        {projectData.cover && (
          <img
            src={`http://localhost:3001${projectData.cover}`}
            alt="Обложка проекта"
            className={styles.cover}
          />
        )}
        <p><b>Заказчик:</b> {projectData.userEmail}</p>
        <p><b>Исполнитель:</b> {projectData.executorEmail || 'Не назначен'}</p>
        <p><b>Тема:</b> {projectData.theme}</p>
        <p><b>Описание проекта:</b> {projectData.description}</p>

        <div className={styles.filesSection}>
          <b>Прикрепленные файлы:</b>
          <div className={styles.filesList}>
            {projectData.files && projectData.files.map((file, i) => (
              <a
                key={i}
                href={`http://localhost:3001${file}`}
                target="_blank"
                rel="noreferrer"
                className={styles.fileItem}
              >
                {file.split('/').pop()}
              </a>
            ))}
          </div>
        </div>

        <p>Статус: {projectData.status}</p>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogo}>
            <img src="/images/logobig.svg" alt="Big Logo" />
          </div>
          <div className={styles.footerContacts}>
            Связаться с нами <br />
            <a href="mailto:support@ideaflow.com">support@ideaflow.com</a><br />
            <p>+7 (123) 456-78-90</p>
          </div>
          <div className={styles.footerSocials}>
            <a href="#"><img src="/images/facebook.svg" alt="Facebook" /></a>
            <a href="#"><img src="/images/twitterx.svg" alt="Twitter" /></a>
            <a href="#"><img src="/images/instagram.svg" alt="Instagram" /></a>
          </div>
        </div>
        <p style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>
          Место, где идеи превращаются в успешные проекты благодаря сотрудничеству заказчиков и фрилансеров.
        </p>
      </footer>
    </>
  );
}
