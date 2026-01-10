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
        
        <h2>I build systems that help creators and startups turn ideas into momentum.</h2>
      </section>
      
      <Now />
      
      <Work />
      
      <About />
      
      <Contact />
    </>
  )
}

export default Home
