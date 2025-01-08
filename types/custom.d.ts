declare module 'bootstrap-icons';
import "express-session";

declare module "express-session" {
    interface SessionData {
        user: User;
    }
}
declare module 'method-override';

declare module 'bcrypt'