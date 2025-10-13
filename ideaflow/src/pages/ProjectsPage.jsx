import React, { useState, useEffect } from 'react';
import styles from './ProjectsPage.module.css';
import { Link } from 'react-router-dom';

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]); // массив выбранных тем
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    fetch('http://localhost:3001/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const topics = ['Верстка сайта', 'Веб-дизайн', 'Брендинг', 'Разработка логотипа'];

  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

 const filteredProjects = projects.filter(project => {
  const lowerSearch = searchTerm.toLowerCase();

  const matchesSearch =
    (project.title?.toLowerCase() || '').includes(lowerSearch) ||
    (project.theme?.toLowerCase() || '').includes(lowerSearch) ||
    (project.description?.toLowerCase() || '').includes(lowerSearch) ||
    (project.cover?.toLowerCase() || '').includes(lowerSearch) ||
    (project.status?.toLowerCase() || '').includes(lowerSearch) ||
    (project.executorEmail?.toLowerCase() || '').includes(lowerSearch) ||
    (project.performerEmail?.toLowerCase() || '').includes(lowerSearch) ||
    (project.topic?.toLowerCase() || '').includes(lowerSearch);

  const matchesTopic = selectedTopics.length === 0 || selectedTopics.includes(project.topic);

  return matchesSearch && matchesTopic;
});


  if (loading) return <p>Загрузка проектов...</p>;

  return (
    <>
      <header className={styles.header}>
        <Link to="/">
          <img src="images/logosmall.svg" alt="IdeaFlow logo" style={{ height: 80 }} />
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

      <main className={styles.projectsMain} style={{ position: 'relative' }}>
        <h1 className={styles.projectsTitle}>Реализованные идеи</h1>
        <div className={styles.projectsControls}>
          <button className={styles.projectsFilter} onClick={() => setFilterOpen(true)}>
            Фильтр
            <img src="images/filter-icon.svg" alt="Фильтр" />
          </button>
          <div className={styles.projectsSearchWrapper}>
            <input
              className={styles.projectsSearch}
              type="text"
              placeholder="Поиск"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className={styles.projectsSearchBtn}>
              <img src="images/search-icon.svg" alt="Поиск" />
            </button>
          </div>
        </div>

        {filterOpen && (
          <div className={styles.modalOverlay} onClick={() => setFilterOpen(false)}>
            <div className={styles.filterSidebar} onClick={(e) => e.stopPropagation()}>
              <h3>Фильтр по теме</h3>
              <ul>
                {topics.map(topic => (
                  <li key={topic}>
                    <label>
                      <input
                        type="checkbox"
                        name="topicFilter"
                        value={topic}
                        checked={selectedTopics.includes(topic)}
                        onChange={() => toggleTopic(topic)}
                      />
                      {topic}
                    </label>
                  </li>
                ))}
                <li>
                  <button onClick={() => { setSelectedTopics([]); setFilterOpen(false); }}>
                    Сбросить
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        <p className={styles.projectsRecommendation}>Рекомендации для вас</p>
        <div className={styles.projectsGrid}>
         {filteredProjects.map(project => (
  <Link to={`/projects/${project.id}`} key={project.id} className={styles.projectCardLink}>
    <div className={styles.projectCard}>
      <img
        className={styles.projectImage}
        src={`http://localhost:3001${project.cover || ''}`}
        alt={`Фото исполнителя ${project.performerEmail}`}
      />
      <div className={styles.projectInfo}>
          <div className={styles.projectTopic}>{project.theme || project.title}</div>
          <div className={styles.projectTitle}>Название: {project.title}</div>
          <div className={styles.projectStatus}>Статус: {project.status || 'неизвестен'}</div>
        </div>
    </div>
  </Link>
))}
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogo}>
            <img src="images/logobig.svg" alt="Big Logo" />
          </div>
          <div className={styles.footerContacts}>
            Связаться с нами <br />
            <a href="mailto:support@ideaflow.com">support@ideaflow.com</a><br />
            <p>+7 (123) 456-78-90</p>
          </div>
          <div className={styles.footerSocials}>
            <a href="#"><img src="images/facebook.svg" alt="Facebook" /> </a>
            <a href="#"><img src="images/twitterx.svg" alt="Twitter" /> </a>
            <a href="#"><img src="images/instagram.svg" alt="Instagram" /> </a>
          </div>
        </div>
        <p style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>
          Место, где идеи превращаются в успешные проекты благодаря сотрудничеству заказчиков и фрилансеров.
        </p>
      </footer>
    </>
  );
}
