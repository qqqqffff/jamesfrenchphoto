import { Link, Outlet, useLoaderData, useRevalidator } from 'react-router-dom'
import bannerIcon from '../../assets/headerPhoto.png'
import { Dropdown } from 'flowbite-react'
import { UserProfile, UserStorage } from '../../types'
import { HiOutlineMenu } from "react-icons/hi";
import { HiOutlineCheckCircle } from "react-icons/hi2";
import useWindowDimensions from '../../hooks/windowDimensions'
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../../amplify/data/resource';
import { useEffect, useState } from 'react';
import { fetchUserProfile } from '../../App';

const client = generateClient<Schema>()

export default function Header() {
    const userStorage: UserStorage | undefined = window.localStorage.getItem('user') !== null ? JSON.parse(window.localStorage.getItem('user')!) : undefined;
    const adminState = userStorage !== undefined && userStorage.groups !== undefined && userStorage.groups.includes('ADMINS')
    const [userProfile, setUserProfile] = useState(useLoaderData() as UserProfile | null)
    const { width } = useWindowDimensions()
    const revalidator = useRevalidator()

    useEffect(() => {
        const api = async () => {
            if(userStorage !== undefined && userProfile == null){
                const tempUserProfile = await fetchUserProfile(userStorage)
                setUserProfile(tempUserProfile)
            }
            else if(userStorage === undefined && userProfile !== null){
                setUserProfile(null)
            }
        }
        api()
    }, [userStorage])

    function ProfileDropdownContent() {
        let dashboardUrl = '/' +  (adminState !== undefined && adminState ? 'admin' : 'client') + '/dashboard'
        let profileUrl = '/' + (adminState !== undefined && adminState ? 'admin' : 'client') + '/profile'

        return (
            <>
                {adminState ? undefined : (<Dropdown.Item href={profileUrl}>Profile</Dropdown.Item>)}
                <Dropdown.Item href={dashboardUrl}>Dashboard</Dropdown.Item>
                {adminState ? undefined : (<Dropdown.Item>
                    <Dropdown
                        arrowIcon={false}
                        inline
                        label={'Participants'}
                        trigger='hover'
                        placement='left'
                    >
                        {userProfile?.participant.map((participant, index) => {
                            return (
                                <Dropdown.Item key={index} 
                                    onClick={async () => {
                                        if(userProfile.activeParticipant?.id !== participant.id){
                                            await client.models.UserProfile.update({
                                                email: userProfile.email,
                                                activeParticipant: participant.id
                                            })

                                            const tempProfile = {...userProfile}
                                            tempProfile.activeParticipant = participant
                                            
                                            revalidator.revalidate()
                                            setUserProfile(tempProfile)
                                        }
                                    }}
                                >{participant.id === userProfile.activeParticipant?.id ? (
                                    <HiOutlineCheckCircle fontSize={'32'}/>
                                ) : (<></>)}{`${participant.preferredName && participant.preferredName !== '' ? participant.preferredName : participant.firstName} ${participant.lastName}`}</Dropdown.Item>
                            )
                        })}
                    </Dropdown>
                </Dropdown.Item>)}
                <Dropdown.Item href='/logout'>Logout</Dropdown.Item>
            </>
        )
    }

    function renderHeaderItems(){
        return (userStorage === undefined) ? (width > 800 ? (
            <Link to='login'>Login</Link>
        ) : (
            <Dropdown.Item href='/login'>Login</Dropdown.Item>
        )) : (
            width > 800 ? ( 
                (<Dropdown
                    arrowIcon={false}
                    inline
                    label={'Profile'}
                    trigger='hover'
                >
                    <ProfileDropdownContent />
                </Dropdown>)
            ) : (
                <ProfileDropdownContent />
            )
        )
    }
    
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
                <div className={'flex flex-row items-center lg:px-12 text-xl w-full justify-end gap-10' + borders}>
                {
                    width > 800 ? 
                    (
                        <>
                            <Link to="contact-form">Contact Us</Link>
                            {renderHeaderItems()}
                        </>
                    ) : (
                        <Dropdown label={(<HiOutlineMenu className='text-xl' />)} color='light' arrowIcon={false} trigger='hover'>
                            <Dropdown.Item><Link to="contact-form">Contact Us</Link></Dropdown.Item>
                            <Dropdown.Divider className='bg-gray-300'/>
                            {renderHeaderItems()}
                        </Dropdown>
                    )
                }
                </div>
            </div>
            <Outlet />
        </>
    )
}