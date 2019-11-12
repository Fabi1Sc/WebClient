import blackFriday from './directives/blackFriday';
import blackFridayCountdown from './directives/blackFridayCountdown';
import blackFridayModel from './factories/blackFridayModel';
import blackFridayModal from './modals/blackFridayModal';
import blackFridayModalOpener from './factories/blackFridayModalOpener';

export default angular
    .module('proton.blackFriday', [])
    .directive('blackFriday', blackFriday)
    .directive('blackFridayCountdown', blackFridayCountdown)
    .factory('blackFridayModel', blackFridayModel)
    .factory('blackFridayModalOpener', blackFridayModalOpener)
    .factory('blackFridayModal', blackFridayModal).name;
