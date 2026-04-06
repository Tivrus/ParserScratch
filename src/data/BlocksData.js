export const blocks_list = [
    {
        blockKey: 'motion_start',
        category: 'Motion',
        type: 'start-block',
        labels: [
            {
                text: 'start',
                pos: [24, 38]
            }
        ],
        size: ['+', 10],
        fields: []
    },
    
    {
        blockKey: 'motion_move_steps',
        category: 'Motion',
        type: 'default-block',
        labels: [
            {
                text: 'move',
                pos: [24, 28]
            }
        ],
        size: null,
        fields: [
            {
                blockKey: 'steps',
                type: 'Number',
                default: 10,
                pos: [90, 20]
            }
        ]
    },

    {
        blockKey: 'turn_right_steps',
        category: 'Motion',
        type: 'default-block',
        labels: [
            {
                text: 'turn right',
                pos: [24, 28]
            }
        ],
        size: ["+", 20],
        fields: [
            {
                blockKey: 'steps2',
                type: 'Number',
                default: 10,
                pos: [90, 20]
            }
        ]
    },

    {
        blockKey: 'turn_left_steps',
        category: 'Motion',
        type: 'default-block',
        labels: [
            {
                text: 'turn left',
                pos: [24, 28]
            }
        ],
        size: ["+", 10],
        fields: [
            {
                blockKey: 'steps3',
                type: 'Number',
                default: 10,
                pos: [90, 20]
            }
        ]
    },
    
    {
        blockKey: 'control_repeat',
        category: 'Control',
        type: 'c-block',
        labels: [
            {
                text: 'repeat',
                pos: [24, 28]
            }
        ],
        size: null,
        fields: [
            {
                blockKey: 'times',
                type: 'Number',
                default: 10,
                pos: [110, 20]
            }
        ]
    },
    {
        blockKey: 'motion_smth',
        category: 'Control',
        type: 'default-block',
        labels: [
            {
                text: 'SMT',
                pos: [24, 28]
            }
        ],
        size: ['+', 10],
        fields: []
    },
    {
        blockKey: 'control_stop',
        category: 'Control',
        type: 'stop-block',
        labels: [
            {
                text: 'stop',
                pos: [24, 28]
            }
        ],
        size: ["+", 30],
        fields: []
    }
];

