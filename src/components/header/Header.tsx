import { Link, Outlet } from 'react-router-dom'
import bannerIcon from '../../assets/headerPhoto.png'
import { Dropdown } from 'flowbite-react'
import { useEffect, useState } from 'react'
import { UserStorage } from '../../types'


export default function Header() {
    // const [userState, setUserState] = useState(false)
    // const [adminState, setAdminState] = useState(false)
    const [loginRender, setLoginRender] = useState((<></>))
    useEffect(() => {
        let userState = false;
        let adminState = false;
        const userStorage = window.localStorage.getItem('user');
        if(userStorage){
            const user: UserStorage = JSON.parse(userStorage)
            if(user.groups.includes('ADMINS')){
                adminState = true;
            }
            else if(user.groups.includes('USERS')){
                userState = true;
            }
        }
        const dashboardUrl = '/' +  (adminState ? 'admin' : 'client') + '/dashboard'
        setLoginRender(((!userState && !adminState) ? (<Link to='login'>Login</Link>) : 
            (<Dropdown
                arrowIcon={false}
                inline
                label={'Profile'}
                trigger='hover'
            >
                <Dropdown.Item>Profile</Dropdown.Item>
                <Dropdown.Item>
                    <a href={dashboardUrl}>Dashboard</a>
                </Dropdown.Item>
                <Dropdown.Item>
                    <a href='/logout'>Logout</a>
                </Dropdown.Item>
            </Dropdown>)))
    }, [])

    

    
    const dev = false
    const borders = dev ? 'border border-black' : ''
    return (
        <>
            <div className={'grid grid-cols-3 px-8 py-4 font-main border-b-2 border-gray-300 mb-12' + borders}>
                <div className={'flex flex-row justify-between items-center px-12 text-xl ' + borders}>
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
                </div>
                <div className={'flex col-start-2 justify-center items-center ' + borders}>
                    <a className='' href="/">
                        <img className='ml-3 mt-3' src={bannerIcon} alt='James French Photography Banner' width={250} height={200} />
                    </a>
                </div>
                <div className={'flex flex-row justify-between items-center px-12 text-xl' + borders}>
                    <Dropdown
                        arrowIcon={false}
                        inline
                        label={'Promotions'}
                        trigger='hover'
                    >
                        <Dropdown.Item>Senior Portraits</Dropdown.Item>
                    </Dropdown>
                    <Link to="contact-form">Contact Us</Link>
                    <Link to="online-forms">Online Forms</Link>
                    {loginRender}
                </div>
            </div>
            <Outlet />
        </>
    )
}