import Now from './Now'
import Work from './Work'
import About from './About'
import Contact from './Contact'

const Home = () => {
  return (
    <>
      <section>
        <h1>I build systems that help ideas, creators, and people compound.</h1>
        
        <p>I'm a high-agency operator obsessed with monetization, narrative, and turning ideas into momentum.</p>
      </section>
      
      <Now />
      
      <Work />
      
      <About />
      
      <Contact />
    </>
  )
}

export default Home
