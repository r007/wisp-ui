/**
 * Material Symbols for stories and docs only: this is not part of the
 * published library, which takes icons as `ReactNode`.
 */

import add from '@material-symbols/svg-400/outlined/add.svg?raw';
import addFill from '@material-symbols/svg-400/outlined/add-fill.svg?raw';
import arrowBack from '@material-symbols/svg-400/outlined/arrow_back.svg?raw';
import bookmark from '@material-symbols/svg-400/outlined/bookmark.svg?raw';
import bookmarkFill from '@material-symbols/svg-400/outlined/bookmark-fill.svg?raw';
import deleteIcon from '@material-symbols/svg-400/outlined/delete.svg?raw';
import edit from '@material-symbols/svg-400/outlined/edit.svg?raw';
import editFill from '@material-symbols/svg-400/outlined/edit-fill.svg?raw';
import favorite from '@material-symbols/svg-400/outlined/favorite.svg?raw';
import favoriteFill from '@material-symbols/svg-400/outlined/favorite-fill.svg?raw';
import home from '@material-symbols/svg-400/outlined/home.svg?raw';
import homeFill from '@material-symbols/svg-400/outlined/home-fill.svg?raw';
import inbox from '@material-symbols/svg-400/outlined/inbox.svg?raw';
import inboxFill from '@material-symbols/svg-400/outlined/inbox-fill.svg?raw';
import mail from '@material-symbols/svg-400/outlined/mail.svg?raw';
import mailFill from '@material-symbols/svg-400/outlined/mail-fill.svg?raw';
import menu from '@material-symbols/svg-400/outlined/menu.svg?raw';
import moreVert from '@material-symbols/svg-400/outlined/more_vert.svg?raw';
import notifications from '@material-symbols/svg-400/outlined/notifications.svg?raw';
import notificationsFill from '@material-symbols/svg-400/outlined/notifications-fill.svg?raw';
import person from '@material-symbols/svg-400/outlined/person.svg?raw';
import personFill from '@material-symbols/svg-400/outlined/person-fill.svg?raw';
import search from '@material-symbols/svg-400/outlined/search.svg?raw';
import send from '@material-symbols/svg-400/outlined/send.svg?raw';
import settings from '@material-symbols/svg-400/outlined/settings.svg?raw';
import settingsFill from '@material-symbols/svg-400/outlined/settings-fill.svg?raw';
import share from '@material-symbols/svg-400/outlined/share.svg?raw';
import star from '@material-symbols/svg-400/outlined/star.svg?raw';
import starFill from '@material-symbols/svg-400/outlined/star-fill.svg?raw';

/** Material Symbols SVGs share one `0 -960 960 960` viewBox and a single path. */
function SymbolIcon({ raw }: { raw: string }) {
  const path = /\sd="([^"]+)"/.exec(raw)?.[1] ?? '';
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" focusable="false" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export const AddIcon = () => <SymbolIcon raw={add} />;
export const AddFilledIcon = () => <SymbolIcon raw={addFill} />;
export const ArrowBackIcon = () => <SymbolIcon raw={arrowBack} />;
export const BookmarkIcon = () => <SymbolIcon raw={bookmark} />;
export const BookmarkFilledIcon = () => <SymbolIcon raw={bookmarkFill} />;
export const DeleteIcon = () => <SymbolIcon raw={deleteIcon} />;
export const EditIcon = () => <SymbolIcon raw={edit} />;
export const EditFilledIcon = () => <SymbolIcon raw={editFill} />;
export const FavoriteIcon = () => <SymbolIcon raw={favorite} />;
export const FavoriteFilledIcon = () => <SymbolIcon raw={favoriteFill} />;
export const HomeIcon = () => <SymbolIcon raw={home} />;
export const HomeFilledIcon = () => <SymbolIcon raw={homeFill} />;
export const InboxIcon = () => <SymbolIcon raw={inbox} />;
export const InboxFilledIcon = () => <SymbolIcon raw={inboxFill} />;
export const MailIcon = () => <SymbolIcon raw={mail} />;
export const MailFilledIcon = () => <SymbolIcon raw={mailFill} />;
export const MenuIcon = () => <SymbolIcon raw={menu} />;
export const MoreVertIcon = () => <SymbolIcon raw={moreVert} />;
export const NotificationsIcon = () => <SymbolIcon raw={notifications} />;
export const NotificationsFilledIcon = () => <SymbolIcon raw={notificationsFill} />;
export const PersonIcon = () => <SymbolIcon raw={person} />;
export const PersonFilledIcon = () => <SymbolIcon raw={personFill} />;
export const SearchIcon = () => <SymbolIcon raw={search} />;
export const SendIcon = () => <SymbolIcon raw={send} />;
export const SettingsIcon = () => <SymbolIcon raw={settings} />;
export const SettingsFilledIcon = () => <SymbolIcon raw={settingsFill} />;
export const ShareIcon = () => <SymbolIcon raw={share} />;
export const StarIcon = () => <SymbolIcon raw={star} />;
export const StarFilledIcon = () => <SymbolIcon raw={starFill} />;
