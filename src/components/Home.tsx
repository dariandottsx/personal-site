import Now from './Now'
import Work from './Work'
import About from './About'
import Contact from './Contact'
import CustomCursor from './CustomCursor'

const Home = () => {
  return (
    <>
      <CustomCursor />
      <section>
        <h1>Darian Pan</h1>
        
        <h2>I build systems that help ideas, creators, and people compound.</h2>
        
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
