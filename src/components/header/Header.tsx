import { Link, Outlet } from 'react-router-dom'
import bannerIcon from '../../assets/headerPhoto.png'
import { Dropdown } from 'flowbite-react'
import { useEffect, useState } from 'react'
import { UserStorage } from '../../types'

export default function Header() {
    // const [userState, setUserState] = useState(false)
    // const [adminState, setAdminState] = useState(false)
    const [loginRender, setLoginRender] = useState((<></>))
    async function readUserStorage(){
        let userState = false;
        let adminState = false;
        const userStorage = window.localStorage.getItem('user');
        const user: UserStorage | undefined = userStorage ? JSON.parse(userStorage) : undefined
        if(user && user.groups){
            if(user.groups.includes('ADMINS')){
                adminState = true;
            }
            else if(user.groups.includes('USERS')){
                userState = true;
            }
        }
        
        let dashboardUrl = '/' +  (adminState ? 'admin' : 'client') + '/dashboard'
        let profileUrl = ''
        if(user){
            profileUrl = '/' + (adminState ? 'admin' : 'client') + '/profile/' + user.attributes.email
        }
        console.log(profileUrl)
        setLoginRender(((!userState && !adminState) ? (<Link to='login'>Login</Link>) : 
            (<Dropdown
                arrowIcon={false}
                inline
                label={'Profile'}
                trigger='hover'
            >
                <Dropdown.Item>
                    <a href={profileUrl}>
                        Profile
                    </a>
                </Dropdown.Item>
                <Dropdown.Item>
                    <a href={dashboardUrl}>Dashboard</a>
                </Dropdown.Item>
                <Dropdown.Item>
                    <a href='/logout'>Logout</a>
                </Dropdown.Item>
            </Dropdown>)))
    }
    useEffect(() => {
        readUserStorage()
        window.addEventListener('storage', readUserStorage)
        return () => window.removeEventListener('storage', readUserStorage)
    }, [])
    
    const dev = false
    const borders = dev ? 'border border-black' : ''
    return (
        <>
            <div className={'flex flex-row px-8 py-4 font-main border-b-2 border-gray-300' + borders}>
                {/* <div className={'flex flex-row justify-between items-center px-12 text-xl ' + borders}>
                    <Dropdown
                        arrowIcon={false}
                        inline
                        label={'Debutantes'}
                        trigger='hover'
                    >
                        <Dropdown.Item>Dallas Symphony Orchestra</Dropdown.Item>
                        <Dropdown.Item>La Fiesta</Dropdown.Item>
                        <Dropdown.Item>Tyler Rose</Dropdown.Item>
                    </Dropdown>
                    <Dropdown
                        arrowIcon={false}
                        inline
                        label={'Portfolio'}
                        trigger='hover'
                    >
                        <Dropdown.Item>Family</Dropdown.Item>
                        <Dropdown.Item>Children</Dropdown.Item>
                        <Dropdown.Item>Babies</Dropdown.Item>
                        <Dropdown.Item>Bridal</Dropdown.Item>
                        <Dropdown.Item>Seniors & Teens</Dropdown.Item>
                        <Dropdown.Item>Black & White</Dropdown.Item>
                        <Dropdown.Item>Corporate</Dropdown.Item>
                        <Dropdown.Item>Fashion</Dropdown.Item>
                    </Dropdown>
                    <a href='#'>
                        <p>About Us</p>
                    </a>
                    <a href='#'>
                        <p>What To Expect</p>
                    </a>
                </div> */}
                <div className={'flex justify-center items-center' + borders}>
                    <a className='' href="/">
                        <img className='ml-3 mt-3' src={bannerIcon} alt='James French Photography Banner' width={150} height={100} />
                    </a>
                </div>
                <div className={'flex flex-row items-center px-12 text-xl w-full justify-end gap-10' + borders}>
                    {/* <Dropdown
                        arrowIcon={false}
                        inline
                        label={'Promotions'}
                        trigger='hover'
                    >
                        <Dropdown.Item>Senior Portraits</Dropdown.Item>
                    </Dropdown> */}
                    <Link to="contact-form">Contact Us</Link>
                    {/* <Link to="online-forms">Online Forms</Link> */}
                    {loginRender}
                </div>
            </div>
            <Outlet />
        </>
    )
}